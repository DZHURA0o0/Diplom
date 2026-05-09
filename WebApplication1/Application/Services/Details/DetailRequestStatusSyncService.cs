using WebApplication1.Repositories;

namespace WebApplication1.Application.Services.Details;

public class DetailRequestStatusSyncService
{
    private readonly DetailRequestRepository _detailRequests;
    private readonly OrderRepository _orders;

    public DetailRequestStatusSyncService(
        DetailRequestRepository detailRequests,
        OrderRepository orders)
    {
        _detailRequests = detailRequests;
        _orders = orders;
    }

    public async Task SyncAsync()
    {
        var requests = await _detailRequests.GetPendingDecisionRequestsAsync();

        foreach (var request in requests)
        {
            var order = await _orders.GetByIdAsync(request.OrderId);

            if (order == null)
                continue;

            if (!IsStatus(order.Status, "WAITING_DETAILS"))
                continue;

            if (!string.Equals(order.DetailRequestId, request.Id, StringComparison.OrdinalIgnoreCase))
                continue;

            var requestStatus = Normalize(request.Status);

            if (requestStatus == "APPROVED")
            {
                order.Status = "DETAILS_RECEIVED";
                await _orders.UpdateAsync(order);
                continue;
            }

            if (requestStatus == "REJECTED" || requestStatus == "CANCELED")
            {
                order.Status = "INSPECTION";
                await _orders.UpdateAsync(order);
                continue;
            }
        }
    }

    private static string Normalize(string? value)
    {
        return (value ?? "").Trim().ToUpperInvariant();
    }

    private static bool IsStatus(string? current, string expected)
    {
        return string.Equals(current, expected, StringComparison.OrdinalIgnoreCase);
    }
}