using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/boss/orders")]
[Authorize(Roles = "BOSS")]
public class BossController : ControllerBase
{
    private readonly OrderService _orderService;
    private readonly UserService _userService;

    public BossController(OrderService orderService, UserService userService)
    {
        _orderService = orderService;
        _userService = userService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
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

    [HttpPatch("{orderId}/assign-specialist")]
    public async Task<IActionResult> AssignSpecialist(string orderId, [FromBody] AssignSpecialistRequest req)
    {
        var (ok, message, order) = await _orderService.AssignSpecialistAsync(orderId, req);

        if (!ok || order == null)
            return BadRequest(new { message });

        return Ok(new { message });
    }

    [HttpGet("workers")]
    public async Task<IActionResult> GetWorkers()
    {
        var workers = await _userService.GetWorkersAsync();

        var result = workers.Select(x => new
        {
            id = x.Id,
            fullName = x.FullName
        });

        return Ok(result);
    }

    [HttpGet("specialists")]
    public async Task<IActionResult> GetSpecialists()
    {
        var specialists = await _userService.GetSpecialistsAsync();

        var result = specialists.Select(x => new
        {
            id = x.Id,
            fullName = x.FullName
        });

        return Ok(result);
    }
}