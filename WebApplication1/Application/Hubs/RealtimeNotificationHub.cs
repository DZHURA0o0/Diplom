using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebApplication1.Application.Hubs;

[Authorize]
public class RealtimeNotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userId}");
        }

        foreach (var role in Context.User?.FindAll(ClaimTypes.Role) ?? [])
        {
            if (!string.IsNullOrWhiteSpace(role.Value))
                await Groups.AddToGroupAsync(Context.ConnectionId, $"role:{role.Value.ToUpperInvariant()}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"user:{userId}");
        }

        foreach (var role in Context.User?.FindAll(ClaimTypes.Role) ?? [])
        {
            if (!string.IsNullOrWhiteSpace(role.Value))
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"role:{role.Value.ToUpperInvariant()}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}
