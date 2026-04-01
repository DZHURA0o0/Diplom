using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Domain;
using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Authorize(Roles = "WORKER")]
[Route("api/worker/orders")]
public class WorkerOrdersController : ControllerBase
{
    private readonly OrderService _service;
    private readonly UserService _userService;

    public WorkerOrdersController(OrderService service, UserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> My([FromQuery] string? status)
    {
        var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(workerId))
            return Unauthorized();

        var orders = await _service.GetByWorkerAsync(workerId, status);
        var result = new List<object>();

        foreach (var o in orders)
        {
            result.Add(await BuildOrderResponseFromDtoAsync(o));
        }

        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> MyById(string id)
    {
        var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(workerId))
            return Unauthorized();

        var order = await _service.GetByIdAsync(id);

        if (order is null)
            return NotFound(new { message = "Заявку не знайдено." });

        if (!string.Equals(order.WorkerId, workerId, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        var result = await BuildOrderResponseFromOrderAsync(order);
        return Ok(result);
    }

    private async Task<object> BuildOrderResponseFromDtoAsync(OrderDto o)
    {
        string? workerName = null;
        string? specialistName = null;

        var worker = await _userService.GetByIdAsync(o.WorkerId);
        if (worker != null)
            workerName = worker.FullName;

        if (!string.IsNullOrWhiteSpace(o.SpecialistId))
        {
            var specialist = await _userService.GetByIdAsync(o.SpecialistId);
            if (specialist != null)
                specialistName = specialist.FullName;
        }

        return new
        {
            id = o.Id,
            workerId = o.WorkerId,
            workerName,
            specialistId = o.SpecialistId,
            specialistName,
            status = o.Status,
            serviceType = o.ServiceType,
            descriptionProblem = o.DescriptionProblem,
            inspectionResult = o.InspectionResult,
            inspectionAt = o.InspectionAt,
            productionWorkshopNumber = o.ProductionWorkshopNumber,
            floorNumber = o.FloorNumber,
            roomNumber = o.RoomNumber,
            createdAt = o.CreatedAt,
            workReportText = o.WorkReportText,

            complaint = o.Complaint == null ? null : new
            {
                isSubmitted = o.Complaint.IsSubmitted,
                text = o.Complaint.Text,
                createdAt = o.Complaint.CreatedAt,
                resolvedByReportId = o.Complaint.ResolvedByReportId
            }
        };
    }

    private async Task<object> BuildOrderResponseFromOrderAsync(Order o)
    {
        string? workerName = null;
        string? specialistName = null;

        var worker = await _userService.GetByIdAsync(o.WorkerId);
        if (worker != null)
            workerName = worker.FullName;

        if (!string.IsNullOrWhiteSpace(o.SpecialistId))
        {
            var specialist = await _userService.GetByIdAsync(o.SpecialistId);
            if (specialist != null)
                specialistName = specialist.FullName;
        }

        return new
        {
            id = o.Id,
            workerId = o.WorkerId,
            workerName,
            specialistId = o.SpecialistId,
            specialistName,
            detailRequestId = o.DetailRequestId,
            lastWorkReportId = o.LastWorkReportId,
            status = o.Status,
            serviceType = o.ServiceType,
            descriptionProblem = o.DescriptionProblem,
            inspectionResult = o.InspectionResult,
            inspectionAt = o.InspectionAt,
            productionWorkshopNumber = o.ProductionWorkshopNumber,
            floorNumber = o.FloorNumber,
            roomNumber = o.RoomNumber,
            createdAt = o.CreatedAt,

            complaint = o.Complaint == null ? null : new
            {
                isSubmitted = o.Complaint.IsSubmitted,
                text = o.Complaint.Text,
                createdAt = o.Complaint.CreatedAt,
                resolvedByReportId = o.Complaint.ResolvedByReportId
            }
        };
    }

    [HttpPost("{id}/complaint")]
    public async Task<IActionResult> CreateComplaint(string id, [FromBody] CreateComplaintRequest req)
    {
        var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(workerId))
            return Unauthorized();

        if (req == null || string.IsNullOrWhiteSpace(req.Text))
            return BadRequest(new { message = "Текст скарги обов'язковий." });

        if (req.Text.Trim().Length < 5)
            return BadRequest(new { message = "Текст скарги занадто короткий." });

        var order = await _service.GetByIdAsync(id);

        if (order is null)
            return NotFound(new { message = "Заявку не знайдено." });

        if (!string.Equals(order.WorkerId, workerId, StringComparison.OrdinalIgnoreCase))
            return Forbid();

        if (!string.Equals(order.Status, "DONE", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "Скаргу можна подати тільки після завершення заявки." });

        if (order.Complaint != null && order.Complaint.IsSubmitted)
            return BadRequest(new { message = "Скарга вже подана." });

        order.Complaint = new WebApplication1.Domain.ComplaintInfo
        {
            IsSubmitted = true,
            Text = req.Text.Trim(),
            CreatedAt = DateTime.UtcNow,
            ResolvedByReportId = null
        };

        await _service.UpdateAsync(order);

        return Ok(new { message = "Скаргу успішно подано." });
    }
    [HttpPost]
public async Task<IActionResult> Create([FromBody] CreateOrderRequest req)
{
    var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

    if (string.IsNullOrWhiteSpace(workerId))
        return Unauthorized(new { message = "Не вдалося визначити працівника." });

    if (req == null)
        return BadRequest(new { message = "Невірні дані." });

    var (ok, message, order) = await _service.CreateAsync(workerId, req);

    if (!ok || order == null)
        return BadRequest(new { message });

    return Ok(new
    {
        message,
        orderId = order.Id,
        status = order.Status
    });
}

}
