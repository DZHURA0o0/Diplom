using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Application.Services.Order;
using WebApplication1.Domain;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/boss/complaints")]
[Authorize(Roles = "BOSS")]
public class BossComplaintsController : ControllerBase
{
    private readonly OrderService _orderService;

    public BossComplaintsController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPatch("{orderId}/to-rework")]
    public async Task<ActionResult> ToRework(string orderId)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "BOSS";

        var (ok, message, order) = await _orderService.MoveComplaintToReworkAsync(orderId, bossId);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(BuildComplaintResponse(message, order));
    }

    [HttpPatch("{orderId}/resolve")]
    public async Task<ActionResult> Resolve(string orderId, [FromBody] CloseComplaintRequest req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "BOSS";

        var (ok, message, order) = await _orderService.ResolveComplaintAsync(orderId, bossId, req?.Comment);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(BuildComplaintResponse(message, order));
    }

    [HttpPatch("{orderId}/reject")]
    public async Task<ActionResult> Reject(string orderId, [FromBody] CloseComplaintRequest req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "BOSS";

        var (ok, message, order) = await _orderService.RejectComplaintAsync(orderId, bossId, req?.Comment);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(BuildComplaintResponse(message, order));
    }

    private static object BuildComplaintResponse(string? message, Order order)
    {
        return new
        {
            message,
            status = order.Status,
            complaintStatus = GetComplaintStatus(order),
            complaint = new
            {
                isSubmitted = order.Complaint?.IsSubmitted ?? false,
                text = order.Complaint?.Text,
                createdAt = order.Complaint?.CreatedAt,
                resolvedByReportId = order.Complaint?.ResolvedByReportId
            }
        };
    }

    private static string? GetComplaintStatus(Order order)
    {
        var complaint = order.Complaint;

        if (complaint == null || !complaint.IsSubmitted)
            return null;

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return "RESOLVED";

        if (string.Equals(order.Status, "REWORK", StringComparison.OrdinalIgnoreCase))
            return "IN_REWORK";

        return "SUBMITTED";
    }
}

public class CloseComplaintRequest
{
    public string? Comment { get; set; }
}