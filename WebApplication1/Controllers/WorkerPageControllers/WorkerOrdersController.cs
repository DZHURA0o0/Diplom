using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Domain;
using WebApplication1.Models;
using WebApplication1.Repositories;
using MongoDB.Bson;

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

    // ========================= GET LIST =========================

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
            result.Add(await BuildOrderResponseAsync(o));
        }

        return Ok(result);
    }

    // ========================= GET BY ID =========================

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

        var result = await BuildOrderResponseAsync(order);
        return Ok(result);
    }

    // ========================= BUILD RESPONSE (DTO) =========================

    private async Task<object> BuildOrderResponseAsync(OrderDto o)
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

            complaint = new
            {
                isSubmitted = o.Complaint != null &&
                              o.Complaint.Contains("is_submitted") &&
                              o.Complaint["is_submitted"].IsBoolean
                    ? o.Complaint["is_submitted"].AsBoolean
                    : false,

                complaintId = o.Complaint != null &&
                              o.Complaint.Contains("complaint_id") &&
                              o.Complaint["complaint_id"].IsObjectId
                    ? o.Complaint["complaint_id"].AsObjectId.ToString()
                    : null,

                text = o.Complaint != null &&
                       o.Complaint.Contains("text") &&
                       o.Complaint["text"].IsString
                    ? o.Complaint["text"].AsString
                    : null,

                createdAt = o.Complaint != null &&
                            o.Complaint.Contains("created_at") &&
                            o.Complaint["created_at"].IsValidDateTime
                    ? o.Complaint["created_at"].ToUniversalTime()
                    : (DateTime?)null
            }
        };
    }

    // ========================= BUILD RESPONSE (DOMAIN) =========================

    private async Task<object> BuildOrderResponseAsync(Order o)
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
            workReportId = o.WorkReportId,
            status = o.Status,
            serviceType = o.ServiceType,
            descriptionProblem = o.DescriptionProblem,
            inspectionResult = o.InspectionResult,
            inspectionAt = o.InspectionAt,
            productionWorkshopNumber = o.ProductionWorkshopNumber,
            floorNumber = o.FloorNumber,
            roomNumber = o.RoomNumber,
            createdAt = o.CreatedAt,

            complaint = new
            {
                isSubmitted = o.Complaint != null &&
                              o.Complaint.Contains("is_submitted") &&
                              o.Complaint["is_submitted"].IsBoolean
                    ? o.Complaint["is_submitted"].AsBoolean
                    : false,

                complaintId = o.Complaint != null &&
                              o.Complaint.Contains("complaint_id") &&
                              o.Complaint["complaint_id"].IsObjectId
                    ? o.Complaint["complaint_id"].AsObjectId.ToString()
                    : null,

                text = o.Complaint != null &&
                       o.Complaint.Contains("text") &&
                       o.Complaint["text"].IsString
                    ? o.Complaint["text"].AsString
                    : null,

                createdAt = o.Complaint != null &&
                            o.Complaint.Contains("created_at") &&
                            o.Complaint["created_at"].IsValidDateTime
                    ? o.Complaint["created_at"].ToUniversalTime()
                    : (DateTime?)null
            }
        };
    }

    // ========================= CREATE COMPLAINT =========================

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

        var alreadySubmitted =
            order.Complaint != null &&
            order.Complaint.Contains("is_submitted") &&
            order.Complaint["is_submitted"].IsBoolean &&
            order.Complaint["is_submitted"].AsBoolean;

        if (alreadySubmitted)
            return BadRequest(new { message = "Скарга вже подана." });

        order.Complaint = new BsonDocument
        {
            { "is_submitted", true },
            { "complaint_id", ObjectId.GenerateNewId() },
            { "text", req.Text.Trim() },
            { "created_at", DateTime.UtcNow }
        };

        await _service.UpdateAsync(order);

        return Ok(new { message = "Скаргу успішно подано." });
    }
}