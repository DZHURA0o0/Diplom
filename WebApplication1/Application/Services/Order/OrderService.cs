using MongoDB.Bson;
using WebApplication1.Application.Services.Complaints;
using WebApplication1.Domain;
using WebApplication1.Infrastructure.Repositories;
using WebApplication1.Models;
using DomainOrder = WebApplication1.Domain.Order;
using DomainComplaintInfo = WebApplication1.Domain.ComplaintInfo;

namespace WebApplication1.Application.Services.Order;

public class OrderService
{
    private readonly OrderRepository _orders;
    private readonly UserRepository _users;
    private readonly DetailRequestRepository _detailRequests;
    private readonly WorkReportRepository _workReports;
    private readonly ComplaintService _complaints;

    public OrderService(
        OrderRepository orders,
        UserRepository users,
        DetailRequestRepository detailRequests,
        WorkReportRepository workReports,
        ComplaintService complaints)
    {
        _orders = orders;
        _users = users;
        _detailRequests = detailRequests;
        _workReports = workReports;
        _complaints = complaints;
    }

    public Task<List<OrderDto>> GetByWorkerAsync(string workerId, string? status)
        => GetMappedAsync(() => _orders.GetByWorkerAsync(workerId, status));

    public Task<List<OrderDto>> GetBySpecialistAsync(string specialistId, string? status)
        => GetMappedAsync(() => _orders.GetBySpecialistAsync(specialistId, status));

    public Task<List<OrderDto>> GetAllAsync(string? status)
        => GetMappedAsync(() => _orders.GetAllAsync(status));

    public Task<DomainOrder?> GetByIdAsync(string orderId)
        => _orders.GetByIdAsync(orderId);

    public async Task<(bool ok, string? message, DomainOrder? order)> CreateAsync(
        string workerId,
        CreateOrderRequest req)
    {
        if (string.IsNullOrWhiteSpace(workerId))
            return (false, "Unauthorized", null);

        if (req == null)
            return (false, "Request body required", null);

        if (string.IsNullOrWhiteSpace(req.ServiceType))
            return (false, "ServiceType required", null);

        if (string.IsNullOrWhiteSpace(req.DescriptionProblem))
            return (false, "DescriptionProblem required", null);

        if (req.DescriptionProblem.Trim().Length < 5)
            return (false, "Description too short", null);

        var order = new DomainOrder
        {
            WorkerId = workerId,
            SpecialistId = null,
            DetailRequestId = null,
            LastWorkReportId = null,
            ServiceType = req.ServiceType.Trim().ToUpperInvariant(),
            DescriptionProblem = req.DescriptionProblem.Trim(),
            InspectionResult = null,
            InspectionAt = null,
            ProductionWorkshopNumber = req.WorkshopNumber,
            FloorNumber = req.FloorNumber,
            RoomNumber = req.RoomNumber,
            Status = "NEW",
            CreatedAt = DateTime.UtcNow,
            Complaint = new DomainComplaintInfo
            {
                IsSubmitted = false,
                Text = null,
                CreatedAt = null,
                ResolvedByReportId = null
            }
        };

        await _orders.CreateAsync(order);
        return (true, "Order created", order);
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> AssignSpecialistAsync(
        string orderId,
        AssignSpecialistRequest req)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        if (req == null)
            return (false, "Request body required", null);

        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Order not found", null);

        if (IsStatus(order, "DONE"))
            return (false, "Cannot reassign completed order", null);

        if (IsStatus(order, "CANCELED"))
            return (false, "Cannot reassign canceled order", null);

        if (string.IsNullOrWhiteSpace(req.SpecialistId))
            return await RemoveSpecialistAsync(order);

        var specialistId = req.SpecialistId.Trim();
        var specialist = await _users.FindByIdAsync(specialistId);

        if (specialist == null)
            return (false, "Specialist not found", null);

        if (!string.Equals(specialist.RoleInSystem, "SPECIALIST", StringComparison.OrdinalIgnoreCase))
            return (false, "Selected user is not a specialist", null);

        if (!string.Equals(specialist.AccountStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            return (false, "Specialist is inactive", null);

        order.SpecialistId = specialistId;
        order.Status = "ASSIGNED";

        await _orders.UpdateAsync(order);
        return (true, "Specialist assigned", order);
    }

    public async Task<(bool ok, string? message)> StartWorkAsync(string orderId, string? specialistId)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (!IsStatus(order, "ASSIGNED"))
            return (false, "Почати роботу можна тільки для заявки у статусі ASSIGNED.");

        order.Status = "IN_PROGRESS";
        await _orders.UpdateAsync(order);

        return (true, "Роботу розпочато.");
    }

    public async Task<(bool ok, string? message)> SaveInspectionAsync(
        string orderId,
        string? specialistId,
        string? inspectionResult)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (string.IsNullOrWhiteSpace(inspectionResult))
            return (false, "Результат огляду порожній.");

        if (!IsAnyStatus(order, "IN_PROGRESS", "ASSIGNED", "REWORK"))
            return (false, "Огляд можна зберігати тільки для заявки у роботі.");

        order.InspectionResult = inspectionResult.Trim();
        order.InspectionAt = DateTime.UtcNow;
        order.Status = "INSPECTION";

        await _orders.UpdateAsync(order);
        return (true, "Результат огляду збережено.");
    }

    public async Task<(bool ok, string? message)> CreateDetailRequestAsync(
        string orderId,
        string? specialistId,
        string? detailNeeds,
        string? explanation)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (string.IsNullOrWhiteSpace(detailNeeds))
            return (false, "Не вказано потрібні деталі.");

        if (IsAnyStatus(order, "CANCELED", "DONE", "UNDER_COMPLAINT", "REWORK_REVIEW"))
            return (false, "Для цієї заявки вже не можна створити запит на деталі.");

        if (!IsAnyStatus(order, "INSPECTION", "WAITING_DETAILS", "DETAILS_RECEIVED"))
            return (false, "Запит на деталі можна створити тільки після огляду або під час очікування деталей.");

        var request = new DetailRequest
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId!.Trim(),
            DetailNeeds = detailNeeds.Trim(),
            Explanation = string.IsNullOrWhiteSpace(explanation) ? null : explanation.Trim(),
            Status = "CREATED",
            CreatedAt = DateTime.UtcNow
        };

        await _detailRequests.CreateAsync(request);

        AddDetailRequestId(order, request.Id);
        order.DetailRequestId = request.Id;
        order.Status = "WAITING_DETAILS";

        await _orders.UpdateAsync(order);
        return (true, "Запит на деталі створено.");
    }

    public async Task<(bool ok, string? message)> MoveToExecutionAsync(string orderId, string? specialistId)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (IsStatus(order, "WAITING_DETAILS"))
        {
            var requests = await GetOrderDetailRequestsAsync(order);

            if (requests.Any(IsActiveDetailRequest))
                return (false, "Заявка ще очікує деталей. Спочатку потрібно отримати всі активні запити.");

            await RecalculateOrderDetailStatusAsync(order);

            if (IsStatus(order, "WAITING_DETAILS"))
                return (false, "Заявка ще очікує деталей. Спочатку потрібно отримати всі активні запити.");
        }

        if (!IsAnyStatus(order, "INSPECTION", "DETAILS_RECEIVED", "REWORK"))
            return (false, "Перевести до виконання можна тільки після огляду, деталей або під час переробки.");

        order.Status = "EXECUTION";

        await _orders.UpdateAsync(order);
        return (true, "Заявку переведено у виконання.");
    }

    public async Task<(bool ok, string? message)> FinishOrderAsync(
        string orderId,
        string? specialistId,
        string? workReportText)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (string.IsNullOrWhiteSpace(workReportText))
            return (false, "Текст звіту порожній.");

        if (!IsAnyStatus(order, "EXECUTION", "REWORK"))
            return (false, "Завершити можна тільки заявку у виконанні або на переробці.");

        var report = new WorkReport
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId!.Trim(),
            ReportText = workReportText.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _workReports.CreateAsync(report);

        order.LastWorkReportId = report.Id;
        order.Status = "DONE";

        if (order.Complaint != null && order.Complaint.IsSubmitted)
            order.Complaint.ResolvedByReportId = report.Id;

        await _orders.UpdateAsync(order);
        return (true, "Заявку завершено.");
    }

    public Task UpdateAsync(DomainOrder order)
        => _orders.UpdateAsync(order);

    public Task<(bool ok, string? message, DomainOrder? order)> SubmitComplaintByWorkerAsync(
        string orderId,
        string workerId,
        string? text)
        => _complaints.SubmitByWorkerAsync(orderId, workerId, text);

    public Task<(bool ok, string? message, DomainOrder? order)> MoveComplaintToReworkAsync(
        string orderId,
        string bossId)
        => _complaints.MoveToReworkAsync(orderId, bossId);

    public Task<(bool ok, string? message, DomainOrder? order)> ResolveComplaintAsync(
        string orderId,
        string bossId,
        string? comment)
        => _complaints.ResolveAsync(orderId, bossId, comment);

    public Task<(bool ok, string? message, DomainOrder? order)> RejectComplaintAsync(
        string orderId,
        string bossId,
        string? comment)
        => _complaints.RejectAsync(orderId, bossId, comment);

    public async Task<int> HandleSpecialistDeactivationAsync(string specialistId)
    {
        if (string.IsNullOrWhiteSpace(specialistId))
            return 0;

        var orders = await _orders.GetActiveBySpecialistAsync(specialistId);
        if (orders.Count == 0)
            return 0;

        foreach (var order in orders)
        {
            order.SpecialistId = null;
            order.LastWorkReportId = null;
            order.Status = "NEW";

            await _orders.UpdateAsync(order);
        }

        return orders.Count;
    }

    public async Task<List<WorkReportDto>> GetReportsByOrderIdAsync(string orderId)
    {
        var reports = await _workReports.GetByOrderIdAsync(orderId);

        return reports
            .Select(x => new WorkReportDto
            {
                Id = x.Id,
                OrderId = x.OrderId,
                SpecialistId = x.SpecialistId,
                ReportText = x.ReportText,
                CreatedAt = x.CreatedAt
            })
            .ToList();
    }

    private async Task<List<OrderDto>> GetMappedAsync(Func<Task<List<DomainOrder>>> fetch)
    {
        var orders = await fetch();
        var result = new List<OrderDto>();

        foreach (var order in orders)
            result.Add(await MapAsync(order));

        return result;
    }

    private async Task<OrderDto> MapAsync(DomainOrder order)
    {
        var detailRequests = await GetOrderDetailRequestsAsync(order);
        await RecalculateOrderDetailStatusAsync(order, detailRequests);

        var dto = OrderMapper.ToDto(order);

        if (!string.IsNullOrWhiteSpace(order.LastWorkReportId))
        {
            var report = await _workReports.GetByIdAsync(order.LastWorkReportId);
            if (report != null)
                dto.WorkReportText = report.ReportText;
        }

        dto.DetailRequests = detailRequests
            .OrderByDescending(x => x.CreatedAt)
            .Select(OrderMapper.ToDto)
            .ToList();

        var lastRequest = detailRequests
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

        if (lastRequest != null)
        {
            dto.DetailRequestId = lastRequest.Id;
            dto.DetailNeeds = lastRequest.DetailNeeds;
            dto.DetailExplanation = lastRequest.Explanation;
            dto.DetailRequestStatus = lastRequest.Status;
        }

        dto.LastWorkReportId = order.LastWorkReportId;
        return dto;
    }

    private async Task RecalculateOrderDetailStatusAsync(DomainOrder order)
    {
        var requests = await GetOrderDetailRequestsAsync(order);
        await RecalculateOrderDetailStatusAsync(order, requests);
    }

    private async Task RecalculateOrderDetailStatusAsync(
        DomainOrder order,
        List<DetailRequest> requests)
    {
        if (requests.Count == 0 || IsAnyStatus(order, "CANCELED", "DONE", "UNDER_COMPLAINT", "REWORK", "REWORK_REVIEW"))
            return;

        var nextStatus = requests.Any(IsActiveDetailRequest)
            ? "WAITING_DETAILS"
            : "DETAILS_RECEIVED";

        if (IsStatus(order, nextStatus))
            return;

        order.Status = nextStatus;
        await _orders.UpdateAsync(order);
    }

    private async Task<List<DetailRequest>> GetOrderDetailRequestsAsync(DomainOrder order)
    {
        var ids = OrderMapper.GetAllDetailRequestIds(order);

        var byIds = ids.Count > 0
            ? await _detailRequests.GetByIdsAsync(ids)
            : new List<DetailRequest>();

        var byOrderId = await _detailRequests.GetByOrderIdAsync(order.Id);

        return byIds
            .Concat(byOrderId)
            .GroupBy(x => x.Id)
            .Select(x => x.First())
            .OrderByDescending(x => x.CreatedAt)
            .ToList();
    }

    private async Task<(bool ok, string? message, DomainOrder? order)> RemoveSpecialistAsync(DomainOrder order)
    {
        order.SpecialistId = null;
        order.LastWorkReportId = null;
        order.Status = "NEW";

        await _orders.UpdateAsync(order);
        return (true, "Specialist removed", order);
    }

    private async Task<(bool ok, string? message, DomainOrder? order)> GetAssignedOrderAsync(
        string orderId,
        string? specialistId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "Не вказано id заявки.", null);

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не визначено спеціаліста.", null);

        var order = await _orders.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Заявку не знайдено.", null);

        if (!string.Equals(order.SpecialistId, specialistId.Trim(), StringComparison.OrdinalIgnoreCase))
            return (false, "Заявка не призначена цьому спеціалісту.", null);

        return (true, null, order);
    }

    private static void AddDetailRequestId(DomainOrder order, string requestId)
    {
        order.DetailRequestIds ??= new List<string>();

        if (!order.DetailRequestIds.Any(x => string.Equals(x, requestId, StringComparison.OrdinalIgnoreCase)))
            order.DetailRequestIds.Add(requestId);
    }

    private static bool IsStatus(DomainOrder order, string status)
        => string.Equals(order.Status, status, StringComparison.OrdinalIgnoreCase);

    private static bool IsAnyStatus(DomainOrder order, params string[] statuses)
        => statuses.Any(status => IsStatus(order, status));

    private static bool IsDetailStatus(DetailRequest request, string status)
        => string.Equals(
            NormalizeDetailRequestStatus(request.Status),
            status,
            StringComparison.OrdinalIgnoreCase);

    private static bool IsActiveDetailRequest(DetailRequest request)
        => IsDetailStatus(request, "CREATED") ||
           IsDetailStatus(request, "WAITING");

    private static string NormalizeDetailRequestStatus(string? status)
    {
        var normalized = (status ?? "").Trim().ToUpperInvariant();
        return normalized switch
        {
            "REJECTED" => "CANCELED",
            "RESERVED" => "WAITING",
            _ => normalized
        };
    }
}
