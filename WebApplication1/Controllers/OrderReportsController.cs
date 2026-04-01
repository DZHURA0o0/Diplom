using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers.WorkerPageControllers;

[ApiController]
[Route("api/orders/{orderId}/reports")]
[Authorize]
public class OrderReportsController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrderReportsController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet]
    public async Task<IActionResult> GetReports(string orderId)
    {
        var order = await _orderService.GetByIdAsync(orderId);
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

        var reports = await _orderService.GetReportsByOrderIdAsync(orderId);
        return Ok(reports);
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