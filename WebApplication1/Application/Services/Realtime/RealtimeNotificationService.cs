using Microsoft.AspNetCore.SignalR;
using WebApplication1.Application.Hubs;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Realtime;

public class RealtimeNotificationService
{
    private readonly IHubContext<RealtimeNotificationHub> _hubContext;
    private readonly ILogger<RealtimeNotificationService> _logger;

    public RealtimeNotificationService(
        IHubContext<RealtimeNotificationHub> hubContext,
        ILogger<RealtimeNotificationService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyOrderChangedAsync(
        DomainOrder? order,
        string eventType,
        string? message = null,
        IEnumerable<string?>? extraUserIds = null,
        CancellationToken cancellationToken = default)
    {
        if (order == null || string.IsNullOrWhiteSpace(order.Id))
            return;

        var payload = new
        {
            orderId = order.Id,
            workerId = order.WorkerId,
            specialistId = order.SpecialistId,
            status = order.Status,
            eventType,
            message = message ?? "Order updated"
        };

        var tasks = new List<Task>
        {
            _hubContext.Clients.Group("role:BOSS").SendAsync("orderChanged", payload, cancellationToken)
        };

        if (!string.IsNullOrWhiteSpace(order.WorkerId))
            tasks.Add(_hubContext.Clients.Group($"user:{order.WorkerId}").SendAsync("orderChanged", payload, cancellationToken));

        if (!string.IsNullOrWhiteSpace(order.SpecialistId))
            tasks.Add(_hubContext.Clients.Group($"user:{order.SpecialistId}").SendAsync("orderChanged", payload, cancellationToken));

        foreach (var userId in extraUserIds ?? [])
        {
            if (!string.IsNullOrWhiteSpace(userId) &&
                !string.Equals(userId, order.WorkerId, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(userId, order.SpecialistId, StringComparison.OrdinalIgnoreCase))
            {
                tasks.Add(_hubContext.Clients.Group($"user:{userId}").SendAsync("orderChanged", payload, cancellationToken));
            }
        }

        await Task.WhenAll(tasks);

        _logger.LogInformation(
            "Realtime order event sent. OrderId={OrderId}, EventType={EventType}, Status={Status}",
            order.Id,
            eventType,
            order.Status
        );
    }
}
