using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Contracts;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/specialist/orders")]
[Authorize(Roles = "SPECIALIST")]
public class SpecialistReportsController : ControllerBase
{
    private readonly SpecialistWorkReportService _service;

    public SpecialistReportsController(SpecialistWorkReportService service)
    {
        _service = service;
    }

    [HttpPost("{id}/report")]
    public async Task<IActionResult> AddReport(string id, [FromBody] AddWorkReportRequest req)
    {
        var specialistId =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirstValue("sub");

        if (string.IsNullOrWhiteSpace(specialistId))
            return Unauthorized(new { message = "Не вдалося визначити спеціаліста з токена." });

        var result = await _service.AddReportAsync(
            id,
            specialistId,
            req.ReportText,
            req.IsRework
        );

        if (!result.ok)
            return BadRequest(new { message = result.error });

        return Ok(new { message = "Звіт успішно додано." });
    }
}