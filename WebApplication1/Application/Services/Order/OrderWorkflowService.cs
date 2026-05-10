using MongoDB.Bson;
using WebApplication1.Domain;
using WebApplication1.Repositories;

namespace WebApplication1.Application.Services.Order;

public class OrderWorkflowService
{
    private readonly OrderRepository _orders;
    private readonly DetailRequestRepository _detailRequests;
    private readonly WorkReportRepository _workReports;

    public OrderWorkflowService(
        OrderRepository orders,
        DetailRequestRepository detailRequests,
        WorkReportRepository workReports)
    {
        _orders = orders;
        _detailRequests = detailRequests;
        _workReports = workReports;
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
        {
            return (false,
                "Запит на деталі можна створити тільки після огляду, під час очікування деталей або після отримання попередніх деталей.");
        }

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

        // Старе поле тримаємо як останній актуальний запит для сумісності.
        order.DetailRequestId = request.Id;

        // Новий запит означає, що заявка знову чекає деталей.
        order.Status = "WAITING_DETAILS";

        await _orders.UpdateAsync(order);

        return (true, "Запит на деталі створено.");
    }

    public async Task<(bool ok, string? message)> ReceiveDetailsAsync(string orderId, string? specialistId)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (!IsStatus(order, "WAITING_DETAILS"))
            return (false, "Позначити отримання деталей можна тільки для заявки у статусі WAITING_DETAILS.");

        var requests = await GetOrderDetailRequestsAsync(order);

        var activeRequests = requests
            .Where(x => IsDetailStatus(x, "CREATED"))
            .ToList();

        if (activeRequests.Count == 0)
            return (false, "У заявки немає активних запитів на деталі.");

        foreach (var request in activeRequests)
        {
            request.Status = "APPROVED";
            request.ApprovedAt = DateTime.UtcNow;

            await _detailRequests.UpdateAsync(request);
        }

        await RecalculateOrderDetailStatusAsync(order);

        return (true, "Деталі отримано. Статус заявки оновлено.");
    }

    public async Task<(bool ok, string? message)> MoveToExecutionAsync(string orderId, string? specialistId)
    {
        var result = await GetAssignedOrderAsync(orderId, specialistId);
        if (!result.ok)
            return (false, result.message);

        var order = result.order!;

        if (IsStatus(order, "WAITING_DETAILS"))
            return (false, "Заявка ще очікує деталей. Спочатку потрібно отримати всі активні запити.");

        if (!IsAnyStatus(order, "INSPECTION", "DETAILS_RECEIVED", "REWORK"))
            return (false, "Перевести до виконання можна тільки після огляду, після отримання деталей або під час переробки.");

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

    private async Task RecalculateOrderDetailStatusAsync(WebApplication1.Domain.Order order)
    {
        var requests = await GetOrderDetailRequestsAsync(order);

        if (requests.Count == 0)
        {
            order.Status = "INSPECTION";
            await _orders.UpdateAsync(order);
            return;
        }

        if (requests.Any(x => IsDetailStatus(x, "CREATED")))
        {
            order.Status = "WAITING_DETAILS";
            await _orders.UpdateAsync(order);
            return;
        }

        var usefulRequests = requests
            .Where(x => !IsDetailStatus(x, "REJECTED") && !IsDetailStatus(x, "CANCELED"))
            .ToList();

        if (usefulRequests.Count == 0)
        {
            order.Status = "INSPECTION";
            await _orders.UpdateAsync(order);
            return;
        }

        if (usefulRequests.All(x => IsDetailStatus(x, "APPROVED")))
        {
            order.Status = "DETAILS_RECEIVED";
            await _orders.UpdateAsync(order);
            return;
        }

        order.Status = "WAITING_DETAILS";
        await _orders.UpdateAsync(order);
    }

    private async Task<List<DetailRequest>> GetOrderDetailRequestsAsync(WebApplication1.Domain.Order order)
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

    private static void AddDetailRequestId(WebApplication1.Domain.Order order, string requestId)
    {
        order.DetailRequestIds ??= new List<string>();

        if (!order.DetailRequestIds.Any(x => string.Equals(x, requestId, StringComparison.OrdinalIgnoreCase)))
        {
            order.DetailRequestIds.Add(requestId);
        }
    }

    private async Task<(bool ok, string? message, WebApplication1.Domain.Order? order)> GetAssignedOrderAsync(
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

    private static bool IsStatus(WebApplication1.Domain.Order order, string status)
    {
        return string.Equals(order.Status, status, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsAnyStatus(WebApplication1.Domain.Order order, params string[] statuses)
    {
        return statuses.Any(status => IsStatus(order, status));
    }

    private static bool IsDetailStatus(DetailRequest request, string status)
    {
        return string.Equals(request.Status, status, StringComparison.OrdinalIgnoreCase);
    }
}