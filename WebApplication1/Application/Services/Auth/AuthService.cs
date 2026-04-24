using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Application.Services.Auth;

public class AuthService
{
    private readonly UserRepository _users;
    private readonly IConfiguration _config;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthService(UserRepository users, IConfiguration config)
    {
        _users = users;
        _config = config;
    }

    public async Task<(bool ok, string? role, string? token)> LoginAsync(string login, string password)
    {
        if (string.IsNullOrWhiteSpace(login) || string.IsNullOrWhiteSpace(password))
            return (false, null, null);

        var user = await _users.FindByLoginAsync(login.Trim());
        if (user is null)
            return (false, null, null);

        if (!string.Equals(user.AccountStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            return (false, null, null);

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verify == PasswordVerificationResult.Failed)
            return (false, null, null);

        var role = (user.RoleInSystem ?? "").Trim().ToUpperInvariant();
        var token = CreateJwtToken(user, role);

        return (true, role, token);
    }

    public async Task<(bool ok, string? message)> RegisterAsync(RegisterRequest request)
    {
        if (request == null)
            return (false, "Request body required");

        if (string.IsNullOrWhiteSpace(request.FullName))
            return (false, "FullName is required");

        if (string.IsNullOrWhiteSpace(request.Login))
            return (false, "Login is required");

        if (string.IsNullOrWhiteSpace(request.Password))
            return (false, "Password is required");

        if (request.PassNumber <= 0)
            return (false, "PassNumber is required");

        var login = request.Login.Trim();

        if (await _users.ExistsByLoginAsync(login))
            return (false, "Login already exists");

        if (await _users.ExistsByPassNumberAsync(request.PassNumber))
            return (false, "PassNumber already exists");

        var user = new User
        {
            FullName = request.FullName.Trim(),
            PassNumber = request.PassNumber,
            RoleInSystem = "WORKER",
            Login = login,
            Position = request.Position?.Trim() ?? "",
            Phone = request.Phone?.Trim() ?? "",
            Email = request.Email?.Trim() ?? "",
            AccountStatus = "ACTIVE",
            FloorNumber = request.FloorNumber,
            OfficeNumber = request.OfficeNumber,
            WorkshopNumber = request.WorkshopNumber,
            CreatedAt = DateTime.UtcNow
        };

        user.PasswordHash = _hasher.HashPassword(user, request.Password);

        await _users.CreateAsync(user);

        return (true, "User registered successfully");
    }

    private string CreateJwtToken(User user, string role)
    {
        var jwt = _config.GetSection("Jwt");

        var issuer = jwt["Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is missing");
        var audience = jwt["Audience"] ?? throw new InvalidOperationException("Jwt:Audience is missing");
        var secret = jwt["Secret"] ?? throw new InvalidOperationException("Jwt:Secret is missing");
        var minutes = int.Parse(jwt["AccessTokenMinutes"] ?? "120");

        var now = DateTime.UtcNow;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim("login", user.Login),
            new Claim(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(minutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}