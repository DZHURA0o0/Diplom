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

        var eventNames = IsDetailRequestEvent(eventType)
            ? new[] { "orderChanged", "detailRequestChanged" }
            : new[] { "orderChanged" };

        var tasks = new List<Task>();

        AddGroupNotifications(tasks, "role:BOSS", eventNames, payload, cancellationToken);

        if (!string.IsNullOrWhiteSpace(order.WorkerId))
            AddGroupNotifications(tasks, $"user:{order.WorkerId}", eventNames, payload, cancellationToken);

        if (!string.IsNullOrWhiteSpace(order.SpecialistId))
            AddGroupNotifications(tasks, $"user:{order.SpecialistId}", eventNames, payload, cancellationToken);

        foreach (var userId in extraUserIds ?? [])
        {
            if (!string.IsNullOrWhiteSpace(userId) &&
                !string.Equals(userId, order.WorkerId, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(userId, order.SpecialistId, StringComparison.OrdinalIgnoreCase))
            {
                AddGroupNotifications(tasks, $"user:{userId}", eventNames, payload, cancellationToken);
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

    public async Task NotifyUserChangedAsync(
        string? userId,
        string eventType,
        string? message = null,
        string? accountStatus = null,
        string? role = null,
        CancellationToken cancellationToken = default)
    {
        var payload = new
        {
            userId,
            eventType,
            message = message ?? "User updated",
            accountStatus,
            role
        };

        var tasks = new List<Task>
        {
            _hubContext.Clients.Group("role:BOSS").SendAsync("userChanged", payload, cancellationToken)
        };

        if (!string.IsNullOrWhiteSpace(userId))
            tasks.Add(_hubContext.Clients.Group($"user:{userId}").SendAsync("userChanged", payload, cancellationToken));

        await Task.WhenAll(tasks);

        _logger.LogInformation(
            "Realtime user event sent. UserId={UserId}, EventType={EventType}, AccountStatus={AccountStatus}, Role={Role}",
            userId,
            eventType,
            accountStatus,
            role
        );
    }

    private void AddGroupNotifications(
        List<Task> tasks,
        string groupName,
        IEnumerable<string> eventNames,
        object payload,
        CancellationToken cancellationToken)
    {
        foreach (var eventName in eventNames)
            tasks.Add(_hubContext.Clients.Group(groupName).SendAsync(eventName, payload, cancellationToken));
    }

    private static bool IsDetailRequestEvent(string? eventType)
    {
        return !string.IsNullOrWhiteSpace(eventType) &&
            eventType.Contains("detailRequest", StringComparison.OrdinalIgnoreCase);
    }
}
