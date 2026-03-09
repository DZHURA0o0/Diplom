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

    public OrdersController(OrderService service)
    {
        _service = service;
    }

    [Authorize(Roles = "WORKER")]
    [HttpGet("my")]
    public async Task<IActionResult> My([FromQuery] string? status)
    {
        var workerId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(workerId))
            return Unauthorized();

        var orders = await _service.GetByWorkerAsync(workerId, status);

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
            createdAt = o.CreatedAt,
            complaint = new
            {
                isSubmitted = o.Complaint.Contains("is_submitted") && o.Complaint["is_submitted"].IsBoolean
                    ? o.Complaint["is_submitted"].AsBoolean
                    : false,

                complaintId = o.Complaint.Contains("complaint_id") && o.Complaint["complaint_id"].IsObjectId
                    ? o.Complaint["complaint_id"].AsObjectId.ToString()
                    : null
            }
        });

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

        return Ok(new
        {
            message,
            order = new
            {
                id = order.Id,
                workerId = order.WorkerId,
                specialistId = order.SpecialistId,
                detailRequestId = order.DetailRequestId,
                status = order.Status,
                serviceType = order.ServiceType,
                descriptionProblem = order.DescriptionProblem,
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