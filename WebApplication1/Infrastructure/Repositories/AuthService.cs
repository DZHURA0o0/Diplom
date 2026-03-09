using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class AuthService
{
    private readonly UserRepository _repo;
    private readonly IConfiguration _config;
    private readonly PasswordHasher<User> _hasher = new();

    public AuthService(UserRepository repo, IConfiguration config)
    {
        _repo = repo;
        _config = config;
    }

    public async Task<(bool ok, string? role, string? token)> LoginAsync(string login, string password)
    {
        var user = await _repo.FindByLoginAsync(login);
        if (user is null) return (false, null, null);

        if (!string.Equals(user.AccountStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            return (false, null, null);

        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verify == PasswordVerificationResult.Failed)
            return (false, null, null);

        var jwt = _config.GetSection("Jwt");
        var issuer = jwt["Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is missing");
        var audience = jwt["Audience"] ?? throw new InvalidOperationException("Jwt:Audience is missing");
        var secret = jwt["Secret"] ?? throw new InvalidOperationException("Jwt:Secret is missing");
        var minutes = int.Parse(jwt["AccessTokenMinutes"] ?? "120");

        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(minutes);

        var role = (user.RoleInSystem ?? "").Trim().ToUpperInvariant();

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim("login", user.Login),
            new Claim(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: creds
        );

        var tokenStr = new JwtSecurityTokenHandler().WriteToken(token);

        return (true, role, tokenStr);
    }

    public async Task<(bool ok, string? message)> RegisterAsync(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FullName) ||
            string.IsNullOrWhiteSpace(request.Login) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return (false, "FullName, Login and Password are required");
        }

        if (request.PassNumber <= 0)
            return (false, "PassNumber is required");

        var login = request.Login.Trim();

        var exists = await _repo.ExistsByLoginAsync(login);
        if (exists)
            return (false, "Login already exists");

        var passNumberExists = await _repo.ExistsByPassNumberAsync(request.PassNumber);
        if (passNumberExists)
            return (false, "PassNumber already exists");

        var role = "WORKER";

        var user = new User
        {
            FullName = request.FullName.Trim(),
            PassNumber = request.PassNumber,
            RoleInSystem = role,
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
        

        await _repo.CreateAsync(user);

        return (true, "User registered successfully");
    }
    public async Task<User?> GetByIdAsync(string userId)
{
    if (string.IsNullOrWhiteSpace(userId))
        return null;

    return await _repo.FindByIdAsync(userId);
}
}