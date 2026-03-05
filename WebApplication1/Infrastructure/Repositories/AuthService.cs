using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;

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

        // ✅ Правильная проверка хеша
        var verify = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verify == PasswordVerificationResult.Failed)
            return (false, null, null);

        var jwt = _config.GetSection("Jwt");
        var issuer = jwt["Issuer"]!;
        var audience = jwt["Audience"]!;
        var secret = jwt["Secret"]!;
        var minutes = int.Parse(jwt["AccessTokenMinutes"] ?? "120");

        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(minutes);

       var claims = new List<Claim>
{
    new Claim(JwtRegisteredClaimNames.Sub, user.Id),
    new Claim("login", user.Login),

    // добавляем простую роль
    new Claim("role", user.RoleInSystem),

    // можно оставить и это (не мешает)
    new Claim(ClaimTypes.Role, user.RoleInSystem)
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

        return (true, user.RoleInSystem, tokenStr);
    }
}