using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Application.Services.Reports;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/specialist/orders")]
[Authorize(Roles = "SPECIALIST")]
public class SpecialistReportsController : ControllerBase
{
    private readonly SpecialistWorkReportService _workReportService;

    public SpecialistReportsController(SpecialistWorkReportService workReportService)
    {
        _workReportService = workReportService;
    }

    [HttpPost("{id}/report")]
    public async Task<ActionResult> AddReport(string id, [FromBody] AddWorkReportRequest req)
    {
        if (req == null)
            return BadRequest(new { message = "Тіло запиту порожнє." });

        var specialistId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(specialistId))
            return Unauthorized(new { message = "Не вдалося визначити спеціаліста з токена." });

        var (ok, error) = await _workReportService.AddReportAsync(
            id,
            specialistId,
            req.ReportText,
            req.IsRework
        );

        if (!ok)
            return BadRequest(new { message = error });

        return Ok(new
        {
            message = req.IsRework
                ? "Звіт по переробці успішно додано. Заявку завершено."
                : "Звіт успішно додано. Заявку завершено."
        });
    }
}
