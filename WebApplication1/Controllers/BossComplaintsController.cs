using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Domain;
using WebApplication1.Repositories;

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
    public async Task<IActionResult> ToRework(string orderId)
    {
        var bossLogin = User.FindFirst("login")?.Value
                        ?? User.FindFirst(ClaimTypes.Name)?.Value
                        ?? "BOSS";

        var (ok, message, order) = await _orderService.MoveComplaintToReworkAsync(orderId, bossLogin);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(new
        {
            message,
            status = order.Status,
            complaintStatus = GetComplaintStatus(order.Complaint),
            complaint = new
            {
                isSubmitted = order.Complaint?.IsSubmitted ?? false,
                text = order.Complaint?.Text,
                createdAt = order.Complaint?.CreatedAt,
                resolvedByReportId = order.Complaint?.ResolvedByReportId
            }
        });
    }

    [HttpPatch("{orderId}/resolve")]
    public async Task<IActionResult> Resolve(string orderId, [FromBody] CloseComplaintRequest req)
    {
        var bossLogin = User.FindFirst("login")?.Value
                        ?? User.FindFirst(ClaimTypes.Name)?.Value
                        ?? "BOSS";

        var (ok, message, order) = await _orderService.ResolveComplaintAsync(orderId, bossLogin, req.Comment);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(new
        {
            message,
            status = order.Status,
            complaintStatus = GetComplaintStatus(order.Complaint),
            complaint = new
            {
                isSubmitted = order.Complaint?.IsSubmitted ?? false,
                text = order.Complaint?.Text,
                createdAt = order.Complaint?.CreatedAt,
                resolvedByReportId = order.Complaint?.ResolvedByReportId
            }
        });
    }

    [HttpPatch("{orderId}/reject")]
    public async Task<IActionResult> Reject(string orderId, [FromBody] CloseComplaintRequest req)
    {
        var bossLogin = User.FindFirst("login")?.Value
                        ?? User.FindFirst(ClaimTypes.Name)?.Value
                        ?? "BOSS";

        var (ok, message, order) = await _orderService.RejectComplaintAsync(orderId, bossLogin, req.Comment);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(new
        {
            message,
            status = order.Status,
            complaintStatus = GetComplaintStatus(order.Complaint),
            complaint = new
            {
                isSubmitted = order.Complaint?.IsSubmitted ?? false,
                text = order.Complaint?.Text,
                createdAt = order.Complaint?.CreatedAt,
                resolvedByReportId = order.Complaint?.ResolvedByReportId
            }
        });
    }

    private static string? GetComplaintStatus(ComplaintInfo? complaint)
    {
        if (complaint == null)
            return null;

        if (!complaint.IsSubmitted)
            return null;

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return "RESOLVED";

        return "SUBMITTED";
    }
}

public class CloseComplaintRequest
{
    public string? Comment { get; set; }
}