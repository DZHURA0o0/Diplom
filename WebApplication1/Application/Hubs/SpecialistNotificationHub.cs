using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace WebApplication1.Application.Hubs;

[Authorize(Roles = "SPECIALIST")]
public class SpecialistNotificationHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var specialistId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!string.IsNullOrWhiteSpace(specialistId))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"specialist:{specialistId}");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var specialistId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!string.IsNullOrWhiteSpace(specialistId))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"specialist:{specialistId}");
        }

        await base.OnDisconnectedAsync(exception);
    }
}