using WebApplication1.Domain;
using WebApplication1.Application.Services.Realtime;
using WebApplication1.Infrastructure.Repositories;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Details;

public class DetailRequestStatusSyncService
{
    private readonly DetailRequestRepository _detailRequests;
    private readonly OrderRepository _orders;
    private readonly RealtimeNotificationService _realtime;
    private readonly ILogger<DetailRequestStatusSyncService> _logger;

    public DetailRequestStatusSyncService(
        DetailRequestRepository detailRequests,
        OrderRepository orders,
        RealtimeNotificationService realtime,
        ILogger<DetailRequestStatusSyncService> logger)
    {
        _detailRequests = detailRequests;
        _orders = orders;
        _realtime = realtime;
        _logger = logger;
    }

    public async Task RecalculateByOrderIdAsync(string? orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return;

        var order = await _orders.GetByIdAsync(orderId.Trim());

        if (order == null)
        {
            _logger.LogWarning("Detail request sync skipped. Order not found: {OrderId}", orderId);
            return;
        }

        if (IsStatus(order.Status, "CANCELED") || IsStatus(order.Status, "DONE"))
        {
            _logger.LogInformation(
                "Detail request sync skipped. Order {OrderId} has final status {Status}",
                order.Id,
                order.Status
            );

            return;
        }

        await RecalculateOrderDetailStatusAsync(order);
    }

    public async Task SyncAsync()
    {
        var requests = await _detailRequests.GetPendingDecisionRequestsAsync();
        var ordersWithDetailRequests = await _orders.GetWithDetailRequestsAsync();

        var orderIds = requests
            .Where(x => !string.IsNullOrWhiteSpace(x.OrderId))
            .Select(x => x.OrderId)
            .Concat(ordersWithDetailRequests.Select(x => x.Id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var orderId in orderIds)
        {
            await RecalculateByOrderIdAsync(orderId);
        }
    }

    private async Task RecalculateOrderDetailStatusAsync(DomainOrder order)
    {
        var requests = await GetOrderDetailRequestsAsync(order);

        if (requests.Count == 0)
        {
            _logger.LogInformation(
                "No detail requests found for order {OrderId}",
                order.Id
            );

            return;
        }

        SyncOrderDetailRequestIds(order, requests);

        if (requests.Any(IsActiveDetailRequest))
        {
            await UpdateOrderStatusIfNeededAsync(order, "WAITING_DETAILS");
            return;
        }

        await UpdateOrderStatusIfNeededAsync(order, "DETAILS_RECEIVED");
    }

    private async Task<List<DetailRequest>> GetOrderDetailRequestsAsync(DomainOrder order)
    {
        var ids = GetAllDetailRequestIds(order);

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

    private async Task UpdateOrderStatusIfNeededAsync(DomainOrder order, string newStatus)
    {
        if (IsStatus(order.Status, newStatus))
        {
            await _orders.UpdateAsync(order);
            await _realtime.NotifyOrderChangedAsync(order, "detailRequestSynced", "Detail request updated");

            _logger.LogInformation(
                "Order {OrderId} detail status sync completed. Status unchanged: {Status}",
                order.Id,
                order.Status
            );

            return;
        }

        var oldStatus = order.Status;
        order.Status = newStatus;

        await _orders.UpdateAsync(order);
        await _realtime.NotifyOrderChangedAsync(order, "detailRequestSynced", "Detail request updated");

        _logger.LogInformation(
            "Order {OrderId} status changed by detail request sync: {OldStatus} -> {NewStatus}",
            order.Id,
            oldStatus,
            newStatus
        );
    }

    private static void SyncOrderDetailRequestIds(DomainOrder order, List<DetailRequest> requests)
    {
        order.DetailRequestIds ??= new List<string>();

        var requestIds = requests
            .Select(x => x.Id)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var id in requestIds)
        {
            if (!order.DetailRequestIds.Any(x => string.Equals(x, id, StringComparison.OrdinalIgnoreCase)))
            {
                order.DetailRequestIds.Add(id);
            }
        }

        var newest = requests
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

        if (newest != null)
            order.DetailRequestId = newest.Id;
    }

    private static List<string> GetAllDetailRequestIds(DomainOrder order)
    {
        var ids = new List<string>();

        if (!string.IsNullOrWhiteSpace(order.DetailRequestId))
        {
            ids.Add(order.DetailRequestId.Trim());
        }

        if (order.DetailRequestIds != null)
        {
            ids.AddRange(
                order.DetailRequestIds
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
            );
        }

        return ids
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static bool IsStatus(string? current, string expected)
    {
        return string.Equals(
            current,
            expected,
            StringComparison.OrdinalIgnoreCase
        );
    }

    private static bool IsDetailStatus(DetailRequest request, string status)
    {
        return string.Equals(
            NormalizeDetailRequestStatus(request.Status),
            status,
            StringComparison.OrdinalIgnoreCase
        );
    }

    private static bool IsActiveDetailRequest(DetailRequest request)
    {
        return IsDetailStatus(request, "CREATED") ||
               IsDetailStatus(request, "WAITING");
    }

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
