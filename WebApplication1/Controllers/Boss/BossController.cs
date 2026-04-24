using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Application.Services.Boss;
using WebApplication1.Application.Services.Order;
using WebApplication1.Application.Services.Users;
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

    public BossController(
        OrderService orderService,
        UserService userService,
        BossOrderDetailsService detailsService)
    {
        _orderService = orderService;
        _userService = userService;
        _detailsService = detailsService;
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
}