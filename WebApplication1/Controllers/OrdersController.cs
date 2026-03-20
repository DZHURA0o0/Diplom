using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly OrderService _service;
    private readonly UserService _userService;

    public OrdersController(OrderService service, UserService userService)
    {
        _service = service;
        _userService = userService;
    }

    [Authorize(Roles = "WORKER")]
    [HttpGet("my")]
    public async Task<IActionResult> My([FromQuery] string? status)
    {
        var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(workerId))
            return Unauthorized();

        var orders = await _service.GetByWorkerAsync(workerId, status);

        var result = new List<object>();

        foreach (var o in orders)
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

            var item = new
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
                        : null
                }
            };

            result.Add(item);
        }

        return Ok(result);
    }

    [Authorize(Roles = "WORKER")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOrderRequest req)
    {
        var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(workerId))
            return Unauthorized();

        var (ok, message, order) = await _service.CreateAsync(workerId, req);

        if (!ok || order is null)
            return BadRequest(new { message });

        var worker = await _userService.GetByIdAsync(order.WorkerId);

        return Ok(new
        {
            message,
            order = new
            {
                id = order.Id,
                workerId = order.WorkerId,
                workerName = worker != null ? worker.FullName : null,
                specialistId = order.SpecialistId,
                specialistName = (string?)null,
                detailRequestId = order.DetailRequestId,
                workReportId = order.WorkReportId,
                status = order.Status,
                serviceType = order.ServiceType,
                descriptionProblem = order.DescriptionProblem,
                inspectionResult = order.InspectionResult,
                inspectionAt = order.InspectionAt,
                productionWorkshopNumber = order.ProductionWorkshopNumber,
                floorNumber = order.FloorNumber,
                roomNumber = order.RoomNumber,
                createdAt = order.CreatedAt,
                complaint = new
                {
                    isSubmitted = false,
                    complaintId = (string?)null
                }
            }
        });
    }
}