using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Domain;
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