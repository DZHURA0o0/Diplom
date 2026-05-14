using WebApplication1.Application.Services.Order;
using WebApplication1.Domain;
using WebApplication1.Models;
using WebApplication1.Infrastructure.Repositories;
using Microsoft.AspNetCore.Identity;

namespace WebApplication1.Application.Services.Users;

public class UserService
{
    private static readonly string[] AllowedRoles = { "WORKER", "SPECIALIST", "BOSS" };
    private static readonly string[] AllowedStatuses = { "ACTIVE", "INACTIVE", "REGISTRATION" };

    private readonly UserRepository _users;
    private readonly OrderService _orderService;
    private readonly PasswordHasher<User> _hasher = new();

    public UserService(UserRepository users, OrderService orderService)
    {
        _users = users;
        _orderService = orderService;
    }

    public Task<List<User>> GetWorkersAsync()
        => _users.GetWorkersAsync();

    public Task<List<User>> GetSpecialistsAsync()
        => _users.GetSpecialistsAsync();

    public Task<List<User>> GetAllSpecialistsAsync()
        => _users.GetAllSpecialistsAsync();

    public Task<User?> GetByIdAsync(string id)
        => _users.FindByIdAsync(id);

    public Task<List<User>> GetAllAsync(string? role, string? status)
    {
        var normalizedRole = NormalizeOrNull(role);
        var normalizedStatus = NormalizeOrNull(status);

        return _users.GetAllAsync(normalizedRole, normalizedStatus);
    }

    public async Task<(bool ok, string message)> UpdateRoleAsync(string userId, string newRole, string? bossId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "User id is required");

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id not found");

        if (userId == bossId)
            return (false, "You cannot change your own role");

        if (string.IsNullOrWhiteSpace(newRole))
            return (false, "Role is required");

        newRole = Normalize(newRole);

        if (!AllowedRoles.Contains(newRole))
            return (false, "Invalid role");

        var user = await _users.FindByIdAsync(userId);
        if (user == null)
            return (false, "User not found");

        var currentRole = Normalize(user.RoleInSystem);
        if (currentRole == newRole)
            return (true, "Role unchanged");

        await _users.UpdateRoleAsync(userId, newRole);
        return (true, "Role updated");
    }

    public async Task<(bool ok, string message)> UpdateStatusAsync(string userId, string newStatus, string? bossId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "User id is required");

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id not found");

        if (userId == bossId)
            return (false, "You cannot deactivate yourself");

        if (string.IsNullOrWhiteSpace(newStatus))
            return (false, "Account status is required");

        newStatus = Normalize(newStatus);

        if (!AllowedStatuses.Contains(newStatus))
            return (false, "Invalid status");

        var user = await _users.FindByIdAsync(userId);
        if (user == null)
            return (false, "User not found");

        var currentStatus = Normalize(user.AccountStatus);
        if (currentStatus == newStatus)
            return (true, "Status unchanged");

        var currentRole = Normalize(user.RoleInSystem);

        if (newStatus == "INACTIVE" && currentRole == "SPECIALIST")
            await _orderService.HandleSpecialistDeactivationAsync(userId);

        await _users.UpdateAccountStatusAsync(userId, newStatus);
        return (true, "Status updated");
    }

    public async Task<(bool ok, string message)> UpdateDetailsAsync(
        string userId,
        UpdateUserDetailsRequest req,
        string? bossId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "User id is required");

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id not found");

        var user = await _users.FindByIdAsync(userId);
        if (user == null)
            return (false, "User not found");

        var fullName = (req.FullName ?? "").Trim();
        var login = (req.Login ?? "").Trim();
        var role = NormalizeOrNull(req.Role);
        var status = NormalizeOrNull(req.AccountStatus);

        if (string.IsNullOrWhiteSpace(fullName))
            return (false, "Full name is required");

        if (string.IsNullOrWhiteSpace(login))
            return (false, "Login is required");

        if (req.PassNumber <= 0)
            return (false, "Pass number is required");

        if (role == null || !AllowedRoles.Contains(role))
            return (false, "Invalid role");

        if (status == null || !AllowedStatuses.Contains(status))
            return (false, "Invalid status");

        if (userId == bossId &&
            (!string.Equals(Normalize(user.RoleInSystem), role, StringComparison.OrdinalIgnoreCase) ||
             !string.Equals(Normalize(user.AccountStatus), status, StringComparison.OrdinalIgnoreCase)))
        {
            return (false, "You cannot change your own role or status");
        }

        var userWithLogin = await _users.FindByLoginAsync(login);
        if (userWithLogin != null && userWithLogin.Id != userId)
            return (false, "Login already exists");

        if (user.PassNumber != req.PassNumber && await _users.ExistsByPassNumberAsync(req.PassNumber))
            return (false, "Pass number already exists");

        var oldStatus = Normalize(user.AccountStatus);
        var oldRole = Normalize(user.RoleInSystem);

        user.FullName = fullName;
        user.Login = login;
        user.PassNumber = req.PassNumber;
        user.RoleInSystem = role;
        user.Position = (req.Position ?? "").Trim();
        user.Phone = (req.Phone ?? "").Trim();
        user.Email = (req.Email ?? "").Trim();
        user.AccountStatus = status;
        user.FloorNumber = req.FloorNumber;
        user.OfficeNumber = req.OfficeNumber;
        user.WorkshopNumber = req.WorkshopNumber;

        if (oldRole == "SPECIALIST" &&
            (role != "SPECIALIST" || (status == "INACTIVE" && oldStatus != "INACTIVE")))
        {
            await _orderService.HandleSpecialistDeactivationAsync(userId);
        }

        await _users.UpdateDetailsAsync(user);
        return (true, "User updated");
    }

    public async Task<(bool ok, string message)> UpdatePasswordAsync(
        string userId,
        string? newPassword,
        string? bossId)
    {
        if (string.IsNullOrWhiteSpace(userId))
            return (false, "User id is required");

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id not found");

        if (string.IsNullOrWhiteSpace(newPassword))
            return (false, "Password is required");

        if (newPassword.Length < 4)
            return (false, "Password must contain at least 4 characters");

        var user = await _users.FindByIdAsync(userId);
        if (user == null)
            return (false, "User not found");

        var hash = _hasher.HashPassword(user, newPassword);
        await _users.UpdatePasswordHashAsync(userId, hash);

        return (true, "Password updated");
    }

    private static string Normalize(string value)
    {
        return value.Trim().ToUpperInvariant();
    }

    private static string? NormalizeOrNull(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim().ToUpperInvariant();
    }
}
