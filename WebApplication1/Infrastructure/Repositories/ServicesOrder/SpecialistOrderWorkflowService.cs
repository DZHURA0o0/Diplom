using MongoDB.Bson;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

public class SpecialistOrderWorkflowService
{
    private readonly OrderRepository _orders;
    private readonly DetailRequestRepository _detailRequests;
    private readonly WorkReportRepository _workReports;

    public SpecialistOrderWorkflowService(
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
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Заявку не знайдено.");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не визначено спеціаліста.");

        if (!string.Equals(order.SpecialistId, specialistId, StringComparison.OrdinalIgnoreCase))
            return (false, "Заявка не призначена цьому спеціалісту.");

        if (!string.Equals(order.Status, "ASSIGNED", StringComparison.OrdinalIgnoreCase))
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
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Заявку не знайдено.");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не визначено спеціаліста.");

        if (!string.Equals(order.SpecialistId, specialistId, StringComparison.OrdinalIgnoreCase))
            return (false, "Заявка не призначена цьому спеціалісту.");

        if (string.IsNullOrWhiteSpace(inspectionResult))
            return (false, "Результат огляду порожній.");

        if (!string.Equals(order.Status, "IN_PROGRESS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.Status, "ASSIGNED", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.Status, "REWORK", StringComparison.OrdinalIgnoreCase))
            return (false, "Огляд можна зберігати тільки для заявки у роботі.");

        order.InspectionResult = inspectionResult.Trim();
        order.InspectionAt = DateTime.UtcNow;

        // КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ:
        // после сохранения огляду переводим заявку на этап принятия решения
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
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Заявку не знайдено.");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не визначено спеціаліста.");

        if (!string.Equals(order.SpecialistId, specialistId, StringComparison.OrdinalIgnoreCase))
            return (false, "Заявка не призначена цьому спеціалісту.");

        if (string.IsNullOrWhiteSpace(detailNeeds))
            return (false, "Не вказано потрібні деталі.");

        if (!string.Equals(order.Status, "INSPECTION", StringComparison.OrdinalIgnoreCase))
            return (false, "Запит на деталі можна створити тільки після огляду.");

        var request = new DetailRequest
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId,
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
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Заявку не знайдено.");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не визначено спеціаліста.");

        if (!string.Equals(order.SpecialistId, specialistId, StringComparison.OrdinalIgnoreCase))
            return (false, "Заявка не призначена цьому спеціалісту.");

        if (!string.Equals(order.Status, "WAITING_DETAILS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.Status, "INSPECTION", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.Status, "REWORK", StringComparison.OrdinalIgnoreCase))
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
        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Заявку не знайдено.");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не визначено спеціаліста.");

        if (!string.Equals(order.SpecialistId, specialistId, StringComparison.OrdinalIgnoreCase))
            return (false, "Заявка не призначена цьому спеціалісту.");

        if (string.IsNullOrWhiteSpace(workReportText))
            return (false, "Текст звіту порожній.");

        if (!string.Equals(order.Status, "EXECUTION", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.Status, "IN_PROGRESS", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(order.Status, "REWORK", StringComparison.OrdinalIgnoreCase))
            return (false, "Завершити можна тільки заявку у виконанні.");

        var report = new WorkReport
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId,
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
}