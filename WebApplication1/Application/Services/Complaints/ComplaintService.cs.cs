using WebApplication1.Domain;
using WebApplication1.Repositories;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Complaints;

public class ComplaintService
{
    private readonly OrderRepository _orders;

    public ComplaintService(OrderRepository orders)
    {
        _orders = orders;
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> SubmitByWorkerAsync(
        string orderId,
        string workerId,
        string? text)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "Order id required", null);

        if (string.IsNullOrWhiteSpace(workerId))
            return (false, "Worker id required", null);

        if (string.IsNullOrWhiteSpace(text))
            return (false, "Текст скарги обов'язковий.", null);

        if (text.Trim().Length < 5)
            return (false, "Текст скарги занадто короткий.", null);

        var order = await _orders.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Заявку не знайдено.", null);

        if (!string.Equals(order.WorkerId, workerId, StringComparison.OrdinalIgnoreCase))
            return (false, "FORBIDDEN", null);

        if (!IsStatus(order, "DONE"))
            return (false, "Скаргу можна подати тільки після завершення заявки.", null);

        if (order.Complaint != null && order.Complaint.IsSubmitted)
            return (false, "Скарга вже подана.", null);

        order.Complaint = new ComplaintInfo
        {
            IsSubmitted = true,
            Text = text.Trim(),
            CreatedAt = DateTime.UtcNow,
            ResolvedByReportId = null,
            ClosedAt = null,
            ClosedBy = null,
            CloseComment = null
        };

        order.Status = "UNDER_COMPLAINT";

        await _orders.UpdateAsync(order);

        return (true, "Скаргу успішно подано. Заявку переведено на оскарження.", order);
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> MoveToReworkAsync(
        string orderId,
        string bossId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id required", null);

        var order = await _orders.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found", null);

        if (!IsStatus(order, "UNDER_COMPLAINT"))
            return (false, "На переробку можна відправити тільки заявку у статусі UNDER_COMPLAINT.", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (complaint.ClosedAt != null || !string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return (false, "Complaint already closed", null);

        order.Status = "REWORK";

        await _orders.UpdateAsync(order);

        return (true, "Заявку відправлено на переробку.", order);
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> ResolveAsync(
        string orderId,
        string bossId,
        string? comment)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id required", null);

        var order = await _orders.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (!IsStatus(order, "REWORK_REVIEW"))
            return (false, "Закрити скаргу можна тільки після того, як спеціаліст завершив переробку.", null);

        if (string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return (false, "Переробку ще не підтверджено повторним звітом спеціаліста.", null);

        if (complaint.ClosedAt != null)
            return (false, "Complaint already closed", null);

        complaint.ClosedAt = DateTime.UtcNow;
        complaint.ClosedBy = bossId.Trim();
        complaint.CloseComment = string.IsNullOrWhiteSpace(comment)
            ? "Скаргу закрито начальником після перевірки переробки."
            : comment.Trim();

        // ВАЖНО:
        // Только начальник переводит заявку в DONE после проверки переробки.
        order.Status = "DONE";

        await _orders.UpdateAsync(order);

        return (true, "Скаргу закрито. Заявку остаточно виконано.", order);
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> RejectAsync(
        string orderId,
        string bossId,
        string? comment)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id required", null);

        var order = await _orders.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found", null);

        if (!IsStatus(order, "UNDER_COMPLAINT"))
            return (false, "Відхилити можна тільки скаргу у статусі UNDER_COMPLAINT.", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (complaint.ClosedAt != null)
            return (false, "Complaint already closed", null);

        complaint.ClosedAt = DateTime.UtcNow;
        complaint.ClosedBy = bossId.Trim();
        complaint.CloseComment = string.IsNullOrWhiteSpace(comment)
            ? "Скаргу відхилено начальником."
            : comment.Trim();

        order.Status = "DONE";

        await _orders.UpdateAsync(order);

        return (true, "Скаргу відхилено. Заявку повернено у статус DONE.", order);
    }

    private static ComplaintInfo EnsureComplaint(DomainOrder order)
    {
        order.Complaint ??= new ComplaintInfo
        {
            IsSubmitted = false,
            Text = null,
            CreatedAt = null,
            ResolvedByReportId = null,
            ClosedAt = null,
            ClosedBy = null,
            CloseComment = null
        };

        return order.Complaint;
    }

    private static bool IsStatus(DomainOrder order, string status)
    {
        return string.Equals(order.Status, status, StringComparison.OrdinalIgnoreCase);
    }
}