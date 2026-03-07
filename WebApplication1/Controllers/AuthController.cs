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
    public IActionResult Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var login = User.FindFirstValue("login");
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new { userId, login, role });
    }

    [HttpPost("seed-hash")]
    public async Task<IActionResult> SeedHash(
        [FromServices] UserRepository repo,
        [FromBody] SeedHashRequest req)
    {
        var login = (req.Login ?? "").Trim();
        var password = req.Password ?? "";

        if (login.Length == 0 || password.Length == 0)
            return BadRequest(new { message = "login/password required" });

        var user = await repo.FindByLoginAsync(login);
        if (user is null)
            return NotFound(new { message = "User not found" });

        var hasher = new PasswordHasher<User>();
        var newHash = hasher.HashPassword(user, password);

        await repo.UpdatePasswordHashAsync(user.Id, newHash);

        return Ok(new { message = "Password hashed and updated", login });
    }

    public record SeedHashRequest(string Login, string Password);
}