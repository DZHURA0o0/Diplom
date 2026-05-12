using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Application.Services.Analytics;
using WebApplication1.Application.Services.Boss;
using WebApplication1.Application.Services.Order;
using WebApplication1.Application.Services.Users;
using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/boss/orders")]
[Authorize(Roles = "BOSS")]
public class BossController : ControllerBase
{
    private readonly OrderService _orderService;
    private readonly UserService _userService;
    private readonly BossOrderDetailsService _detailsService;
    private readonly BossAnalyticsService _analyticsService;

    public BossController(
        OrderService orderService,
        UserService userService,
        BossOrderDetailsService detailsService,
        BossAnalyticsService analyticsService)
    {
        _orderService = orderService;
        _userService = userService;
        _detailsService = detailsService;
        _analyticsService = analyticsService;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? status)
    {
        var orders = await _orderService.GetAllAsync(status);

        var result = orders.Select(o => new
        {
            id = o.Id,
            workerId = o.WorkerId,
            specialistId = o.SpecialistId,
            detailRequestId = o.DetailRequestId,
            status = o.Status,
            serviceType = o.ServiceType,
            descriptionProblem = o.DescriptionProblem,
            productionWorkshopNumber = o.ProductionWorkshopNumber,
            floorNumber = o.FloorNumber,
            roomNumber = o.RoomNumber,
            createdAt = o.CreatedAt
        });

        return Ok(result);
    }

    [HttpGet("{id}/details")]
    public async Task<ActionResult> GetDetails(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return BadRequest(new { message = "Order id is required" });

        var result = await _detailsService.GetDetailsAsync(id);

        if (result == null)
            return NotFound(new { message = "Order not found" });

        return Ok(result);
    }

    [HttpPatch("{orderId}/assign-specialist")]
    public async Task<ActionResult> AssignSpecialist(
        string orderId,
        [FromBody] AssignSpecialistRequest req)
    {
        var (ok, message, order) = await _orderService.AssignSpecialistAsync(orderId, req);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(new
        {
            message,
            orderId = order.Id,
            specialistId = order.SpecialistId,
            status = order.Status
        });
    }

    [HttpGet("workers")]
    public async Task<ActionResult> GetWorkers()
    {
        var workers = await _userService.GetWorkersAsync();

        var result = workers.Select(x => new
        {
            id = x.Id,
            fullName = x.FullName,
            accountStatus = x.AccountStatus
        });

        return Ok(result);
    }

    [HttpGet("specialists")]
    public async Task<ActionResult> GetSpecialists()
    {
        var specialists = await _userService.GetAllSpecialistsAsync();

        var result = specialists.Select(x => new
        {
            id = x.Id,
            fullName = x.FullName,
            accountStatus = x.AccountStatus,
            roleInSystem = x.RoleInSystem
        });

        return Ok(result);
    }

    [HttpGet("/api/boss/users")]
    public async Task<ActionResult> GetUsers([FromQuery] string? role, [FromQuery] string? status)
    {
        var users = await _userService.GetAllAsync(role, status);

        var result = users.Select(u => new
        {
            id = u.Id,
            fullName = u.FullName,
            login = u.Login,
            role = u.RoleInSystem,
            position = u.Position,
            accountStatus = u.AccountStatus
        });

        return Ok(result);
    }

    [HttpPut("/api/boss/users/{id}/role")]
    public async Task<ActionResult> UpdateUserRole(string id, [FromBody] UpdateUserRoleRequest req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var (ok, msg) = await _userService.UpdateRoleAsync(id, req.Role, bossId);

        if (!ok)
            return BadRequest(new { message = msg });

        return Ok(new { message = msg });
    }

    [HttpPut("/api/boss/users/{id}/status")]
    public async Task<ActionResult> UpdateUserStatus(string id, [FromBody] UpdateUserStatusRequest req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var (ok, msg) = await _userService.UpdateStatusAsync(id, req.AccountStatus, bossId);

        if (!ok)
            return BadRequest(new { message = msg });

        return Ok(new { message = msg });
    }

    [HttpGet("/api/boss/analytics")]
    public async Task<ActionResult<BossAnalyticsDto>> GetAnalytics(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? specialistId)
    {
        try
        {
            return Ok(await _analyticsService.GetAnalyticsAsync(from, to, specialistId));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Помилка під час формування аналітики",
                detail = ex.Message
            });
        }
    }

    [HttpPatch("/api/boss/complaints/{orderId}/to-rework")]
    public async Task<ActionResult> MoveComplaintToRework(string orderId)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "BOSS";
        var (ok, message, order) = await _orderService.MoveComplaintToReworkAsync(orderId, bossId);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(BuildComplaintResponse(message, order));
    }

    [HttpPatch("/api/boss/complaints/{orderId}/resolve")]
    public async Task<ActionResult> ResolveComplaint(string orderId, [FromBody] CloseComplaintRequest? req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "BOSS";
        var (ok, message, order) = await _orderService.ResolveComplaintAsync(orderId, bossId, req?.Comment);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(BuildComplaintResponse(message, order));
    }

    [HttpPatch("/api/boss/complaints/{orderId}/reject")]
    public async Task<ActionResult> RejectComplaint(string orderId, [FromBody] CloseComplaintRequest? req)
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
                resolvedByReportId = order.Complaint?.ResolvedByReportId,
                closedAt = order.Complaint?.ClosedAt,
                closedBy = order.Complaint?.ClosedBy,
                closeComment = order.Complaint?.CloseComment
            }
        };
    }

    private static string? GetComplaintStatus(Order order)
    {
        var complaint = order.Complaint;

        if (complaint == null || !complaint.IsSubmitted)
            return null;

        if (complaint.ClosedAt != null && !string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return "RESOLVED";

        if (complaint.ClosedAt != null && string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return "REJECTED";

        if (string.Equals(order.Status, "REWORK_REVIEW", StringComparison.OrdinalIgnoreCase))
            return "REWORK_DONE";

        if (string.Equals(order.Status, "REWORK", StringComparison.OrdinalIgnoreCase))
            return "IN_REWORK";

        if (string.Equals(order.Status, "UNDER_COMPLAINT", StringComparison.OrdinalIgnoreCase))
            return "SUBMITTED";

        return "SUBMITTED";
    }
}

public class CloseComplaintRequest
{
    public string? Comment { get; set; }
}
