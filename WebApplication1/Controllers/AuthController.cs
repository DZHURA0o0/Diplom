using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WebApplication1.Repositories;
using Microsoft.AspNetCore.Identity;


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
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var login = (req.Login ?? "").Trim();
        var password = (req.Password ?? "").Trim();

        var (ok, role, token) = await _auth.LoginAsync(login, password);
        if (!ok) return Unauthorized(new { message = "Invalid credentials or inactive account" });

        return Ok(new { role, token });
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me()
    {
        var login = User.FindFirstValue("login");
        var role = User.FindFirstValue(ClaimTypes.Role);

        return Ok(new { login, role });
    }
    [HttpPost("seed-hash")]
public async Task<IActionResult> SeedHash(
    [FromServices] UserRepository repo,
    SeedHashRequest req)
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

public record LoginRequest(string Login, string Password);