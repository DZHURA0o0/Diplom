using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Application.Services.Order;
using WebApplication1.Application.Services.Users;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/specialist/orders")]
[Authorize(Roles = "SPECIALIST")]
public class SpecialistController : ControllerBase
{
    private readonly OrderService _service;
    private readonly UserService _userService;

    public SpecialistController(OrderService service, UserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [HttpGet]
    public async Task<ActionResult> GetMy([FromQuery] string? status)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(specialistId))
            return Unauthorized();

        var orders = await _service.GetBySpecialistAsync(specialistId, status);

        var result = new List<object>();

        foreach (var o in orders)
        {
            var worker = await _userService.GetByIdAsync(o.WorkerId);

            result.Add(new
            {
                id = o.Id,
                workerId = o.WorkerId,
                workerName = worker?.FullName,

                status = o.Status,
                serviceType = o.ServiceType,
                descriptionProblem = o.DescriptionProblem,

                productionWorkshopNumber = o.ProductionWorkshopNumber,
                floorNumber = o.FloorNumber,
                roomNumber = o.RoomNumber,

                inspectionResult = o.InspectionResult,
                inspectionAt = o.InspectionAt,

                workReportText = o.WorkReportText,
                detailNeeds = o.DetailNeeds,
                detailExplanation = o.DetailExplanation,

                complaint = o.Complaint,
                createdAt = o.CreatedAt
            });
        }

        return Ok(result);
    }

    [HttpGet("{orderId}")]
    public async Task<ActionResult> GetOne(string orderId)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var order = await _service.GetByIdAsync(orderId);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        if (order.SpecialistId != specialistId)
            return Forbid();

        return Ok(order);
    }

    [HttpPatch("{orderId}/start")]
    public async Task<ActionResult> Start(string orderId)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, message) = await _service.StartWorkAsync(orderId, specialistId);

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpPatch("{orderId}/inspection")]
    public async Task<ActionResult> Inspection(string orderId, [FromBody] InspectionRequest req)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, message) = await _service.SaveInspectionAsync(
            orderId,
            specialistId,
            req?.InspectionResult
        );

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpPost("{orderId}/detail-request")]
    public async Task<ActionResult> DetailRequest(string orderId, [FromBody] DetailRequestCreateRequest req)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, message) = await _service.CreateDetailRequestAsync(
            orderId,
            specialistId,
            req?.DetailNeeds,
            req?.Explanation
        );

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpPatch("{orderId}/execution")]
    public async Task<ActionResult> Execution(string orderId)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, message) = await _service.MoveToExecutionAsync(orderId, specialistId);

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpPatch("{orderId}/finish")]
    public async Task<ActionResult> Finish(string orderId, [FromBody] FinishOrderRequest req)
    {
        var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, message) = await _service.FinishOrderAsync(
            orderId,
            specialistId,
            req?.WorkReport
        );

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message });
    }
}