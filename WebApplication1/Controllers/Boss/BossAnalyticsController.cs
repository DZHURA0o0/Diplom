using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Application.Services.Analytics;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/boss/analytics")]
[Authorize(Roles = "BOSS")]
public class BossAnalyticsController : ControllerBase
{
    private readonly BossAnalyticsService _analyticsService;

    public BossAnalyticsController(BossAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    // GET /api/boss/analytics
    // GET /api/boss/analytics?from=2026-05-01&to=2026-05-31
    // GET /api/boss/analytics?from=2026-05-01&to=2026-05-31&specialistId=...
    [HttpGet]
    public async Task<ActionResult<BossAnalyticsDto>> GetAnalytics(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? specialistId)
    {
        try
        {
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
                message = "Помилка під час формування аналітики",
                detail = ex.Message
            });
        }
    }
}