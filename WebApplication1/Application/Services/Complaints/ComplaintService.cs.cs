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
            ResolvedByReportId = null
        };

        await _orders.UpdateAsync(order);

        return (true, "Скаргу успішно подано.", order);
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

        if (!IsStatus(order, "DONE"))
            return (false, "Only DONE order can be moved to REWORK", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return (false, "Complaint already closed", null);

        order.Status = "REWORK";

        await _orders.UpdateAsync(order);

        return (true, "Order moved to rework", order);
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

        if (!IsStatus(order, "REWORK"))
            return (false, "Only REWORK order can resolve complaint", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return (false, "Already resolved", null);

        order.Status = "DONE";

        await _orders.UpdateAsync(order);

        return (true, "Complaint marked as resolved", order);
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

        if (!IsStatus(order, "DONE"))
            return (false, "Only DONE order can reject complaint", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        complaint.IsSubmitted = false;
        complaint.ResolvedByReportId = null;

        await _orders.UpdateAsync(order);

        return (true, "Complaint rejected", order);
    }

  private static ComplaintInfo EnsureComplaint(DomainOrder order)
    {
        order.Complaint ??= new ComplaintInfo
        {
            IsSubmitted = false,
            Text = null,
            CreatedAt = null,
            ResolvedByReportId = null
        };

        return order.Complaint;
    }

   private static bool IsStatus(DomainOrder order, string status)
    {
        return string.Equals(order.Status, status, StringComparison.OrdinalIgnoreCase);
    }
}