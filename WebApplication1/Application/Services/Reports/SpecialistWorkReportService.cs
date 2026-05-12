using MongoDB.Bson;
using WebApplication1.Domain;
using WebApplication1.Infrastructure.Repositories;

namespace WebApplication1.Application.Services.Reports;

public class SpecialistWorkReportService
{
    private readonly OrderRepository _orders;
    private readonly WorkReportRepository _reports;

    public SpecialistWorkReportService(
        OrderRepository orders,
        WorkReportRepository reports)
    {
        _orders = orders;
        _reports = reports;
    }

    public async Task<(bool ok, string? error)> AddReportAsync(
        string orderId,
        string specialistId,
        string reportText,
        bool isRework)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "Не вказано id заявки.");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Не вказано id спеціаліста.");

        if (string.IsNullOrWhiteSpace(reportText))
            return (false, "Текст звіту порожній.");

        if (!isRework)
        {
            return (false,
                "Цей endpoint використовується тільки для повторного звіту по переробці. " +
                "Звичайне завершення заявки виконується через /finish.");
        }

        var order = await _orders.GetByIdAsync(orderId);

        if (order is null)
            return (false, "Заявку не знайдено.");

        if (string.IsNullOrWhiteSpace(order.SpecialistId))
            return (false, "Заявка не призначена спеціалісту.");

        if (!string.Equals(order.SpecialistId, specialistId.Trim(), StringComparison.OrdinalIgnoreCase))
            return (false, "Ця заявка не призначена даному спеціалісту.");

        if (!string.Equals(order.Status, "REWORK", StringComparison.OrdinalIgnoreCase))
            return (false, "Повторний звіт можна додавати тільки для заявки у статусі REWORK.");

        if (order.Complaint is null || !order.Complaint.IsSubmitted)
            return (false, "У заявки немає активної скарги для переробки.");

        if (!string.IsNullOrWhiteSpace(order.Complaint.ResolvedByReportId))
            return (false, "Повторний звіт по цій скарзі вже додано.");

        var report = new WorkReport
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId.Trim(),
            ReportText = reportText.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _reports.CreateAsync(report);

        order.LastWorkReportId = report.Id;

        // ВАЖНО:
        // Спеціаліст НЕ закриває заявку остаточно.
        // Він тільки передає її начальнику на перевірку переробки.
        order.Status = "REWORK_REVIEW";

        order.Complaint.ResolvedByReportId = report.Id;

        await _orders.UpdateAsync(order);

        return (true, null);
    }
}
