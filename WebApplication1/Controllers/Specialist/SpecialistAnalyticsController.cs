using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Application.Services.Analytics;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/specialist/analytics")]
[Authorize(Roles = "SPECIALIST")]
public class SpecialistAnalyticsController : ControllerBase
{
    private readonly SpecialistAnalyticsService _analyticsService;

    public SpecialistAnalyticsController(SpecialistAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    // GET /api/specialist/analytics
    // GET /api/specialist/analytics?from=2026-05-01&to=2026-05-31
    [HttpGet]
    public async Task<ActionResult<SpecialistPanelAnalyticsDto>> GetAnalytics(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        try
        {
            var specialistId = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (string.IsNullOrWhiteSpace(specialistId))
            {
                return Unauthorized(new { message = "Не вдалося визначити спеціаліста" });
            }

            var result = await _analyticsService.GetAnalyticsAsync(
                from,
                to,
                specialistId
            );

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                message = "Помилка під час формування аналітики спеціаліста",
                detail = ex.Message
            });
        }
    }
}