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

        if (!IsStatus(order, "INSPECTION"))
            return (false, "Запит на деталі можна створити тільки після огляду.");

        var request = new DetailRequest
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId!.Trim(),
            DetailNeeds = detailNeeds.Trim(),
            Explanation = string.IsNullOrWhiteSpace(explanation) ? null : explanation.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _detailRequests.CreateAsync(request);

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

        if (!IsAnyStatus(order, "WAITING_DETAILS", "INSPECTION", "REWORK"))
            return (false, "Перевести до виконання не можна для цього статусу.");

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

        if (!IsAnyStatus(order, "EXECUTION", "IN_PROGRESS", "REWORK"))
            return (false, "Завершити можна тільки заявку у виконанні.");

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
}