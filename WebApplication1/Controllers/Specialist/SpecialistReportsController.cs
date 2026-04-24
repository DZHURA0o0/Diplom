using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Application.Services.Order;
using WebApplication1.Contracts;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/specialist/orders")]
[Authorize(Roles = "SPECIALIST")]
public class SpecialistReportsController : ControllerBase
{
    private readonly OrderService _orderService;

    public SpecialistReportsController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpPost("{id}/report")]
    public async Task<ActionResult> AddReport(string id, [FromBody] AddWorkReportRequest req)
    {
        var specialistId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(specialistId))
            return Unauthorized(new { message = "Не вдалося визначити спеціаліста з токена." });

        var (ok, message) = await _orderService.FinishOrderAsync(
            id,
            specialistId,
            req.ReportText
        );

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message = "Звіт успішно додано." });
    }
}