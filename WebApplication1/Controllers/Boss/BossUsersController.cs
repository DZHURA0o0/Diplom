using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Application.Services.Users;
using WebApplication1.Models;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/boss/users")]
[Authorize(Roles = "BOSS")]
public class BossUsersController : ControllerBase
{
    private readonly UserService _service;

    public BossUsersController(UserService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll([FromQuery] string? role, [FromQuery] string? status)
    {
        var users = await _service.GetAllAsync(role, status);

        var result = users.Select(u => new
        {
            id = u.Id,
            fullName = u.FullName,
            login = u.Login,
            role = u.RoleInSystem,
            position = u.Position,
            accountStatus = u.AccountStatus
        });

        return Ok(result);
    }

    [HttpPut("{id}/role")]
    public async Task<ActionResult> UpdateRole(string id, [FromBody] UpdateUserRoleRequest req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, msg) = await _service.UpdateRoleAsync(id, req.Role, bossId);

        if (!ok)
            return BadRequest(new { message = msg });

        return Ok(new { message = msg });
    }

    [HttpPut("{id}/status")]
    public async Task<ActionResult> UpdateStatus(string id, [FromBody] UpdateUserStatusRequest req)
    {
        var bossId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var (ok, msg) = await _service.UpdateStatusAsync(id, req.AccountStatus, bossId);

        if (!ok)
            return BadRequest(new { message = msg });

        return Ok(new { message = msg });
    }
}