using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrderReportsController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrderReportsController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet("{id}/reports")]
    public async Task<IActionResult> GetReports(string id)
    {
        var order = await _orderService.GetByIdAsync(id);
        if (order == null)
            return NotFound(new { message = "Заявку не знайдено." });

        var reports = await _orderService.GetReportsByOrderIdAsync(id);
        return Ok(reports);
    }
}