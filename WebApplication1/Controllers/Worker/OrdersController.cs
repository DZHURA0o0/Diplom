using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Application.Services.Order;

namespace WebApplication1.Controllers.WorkerPageControllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrdersController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult> GetById(string id)
    {
        var order = await _orderService.GetByIdAsync(id);
        if (order == null)
            return NotFound(new { message = "Order not found" });

        var currentUserId = GetCurrentUserId();
        var currentUserRole = GetCurrentUserRole();

        if (string.IsNullOrWhiteSpace(currentUserId))
            return Unauthorized(new { message = "User id not found in token" });

        var canView =
            currentUserRole == "BOSS" ||
            order.WorkerId == currentUserId ||
            (!string.IsNullOrWhiteSpace(order.SpecialistId) && order.SpecialistId == currentUserId);

        if (!canView)
            return Forbid();

        return Ok(order);
    }

    private string? GetCurrentUserId()
    {
        return User.FindFirstValue("sub")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
    }

    private string? GetCurrentUserRole()
    {
        return User.FindFirstValue(ClaimTypes.Role)?.Trim().ToUpperInvariant();
    }
}