using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;

    public AuthController(AuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var login = (req.Login ?? "").Trim();
        var password = (req.Password ?? "").Trim();

        var (ok, role, token) = await _auth.LoginAsync(login, password);
        if (!ok || string.IsNullOrWhiteSpace(role) || string.IsNullOrWhiteSpace(token))
            return Unauthorized(new { message = "Invalid credentials or inactive account" });

        return Ok(new { role, token });
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        var (ok, message) = await _auth.RegisterAsync(req);

        if (!ok)
            return BadRequest(new { message });

        return Ok(new { message = "User registered successfully" });
    }

[Authorize]
[HttpGet("me")]
public async Task<IActionResult> Me()
{
    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
    var login = User.FindFirstValue("login");
    var role = User.FindFirstValue(ClaimTypes.Role);

    if (string.IsNullOrWhiteSpace(userId))
        return Unauthorized();

    var user = await _auth.GetByIdAsync(userId);
    if (user is null)
        return NotFound(new { message = "User not found" });

    return Ok(new
    {
        userId,
        login,
        role,
        fullName = user.FullName,
        floorNumber = user.FloorNumber,
        officeNumber = user.OfficeNumber,
        workshopNumber = user.WorkshopNumber,
        phone = user.Phone,
        email = user.Email,
        position = user.Position
    });
}
}