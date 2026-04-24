using MongoDB.Bson;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

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

        var order = await _orders.GetByIdAsync(orderId);
        if (order is null)
            return (false, "Заявку не знайдено.");

        if (order.SpecialistId != specialistId)
            return (false, "Ця заявка не призначена даному спеціалісту.");

        if (order.Status != "IN_PROGRESS" && order.Status != "REWORK")
            return (false, "Звіт можна додавати тільки для статусів IN_PROGRESS або REWORK.");

        if (isRework && order.Status != "REWORK")
            return (false, "Повторний звіт можна додавати тільки для заявки у статусі REWORK.");

        if (!isRework && order.Status == "REWORK")
            return (false, "Для заявки на переробці треба додавати повторний звіт.");

        var report = new WorkReport
        {
            Id = ObjectId.GenerateNewId().ToString(),
            OrderId = order.Id,
            SpecialistId = specialistId,
            ReportText = reportText.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _reports.CreateAsync(report);

        order.LastWorkReportId = report.Id;
        order.Status = "DONE";

        if (isRework)
        {
            order.Complaint ??= new ComplaintInfo();
            order.Complaint.IsSubmitted = true;
            order.Complaint.ResolvedByReportId = report.Id;
        }

        await _orders.UpdateAsync(order);

        return (true, null);
    }
}