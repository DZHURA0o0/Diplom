using WebApplication1.Application.Services.Order;
using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Application.Services.Users;

public class UserService
{
    private static readonly string[] AllowedRoles = { "WORKER", "SPECIALIST", "BOSS" };
    private static readonly string[] AllowedStatuses = { "ACTIVE", "INACTIVE" };

    private readonly UserRepository _users;
    private readonly OrderCommandService _orderCommandService;

    public UserService(UserRepository users, OrderCommandService orderCommandService)
    {
        _users = users;
        _orderCommandService = orderCommandService;
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
            await _orderCommandService.HandleSpecialistDeactivationAsync(userId);

        await _users.UpdateAccountStatusAsync(userId, newStatus);
        return (true, "Status updated");
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