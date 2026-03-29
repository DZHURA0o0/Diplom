namespace WebApplication1.Repositories;

public class UserService
{
    private readonly UserRepository _repo;
    private readonly OrderService _orderService;

    public UserService(UserRepository repo, OrderService orderService)
    {
        _repo = repo;
        _orderService = orderService;
    }

    public async Task<List<User>> GetWorkersAsync()
    {
        return await _repo.GetWorkersAsync();
    }

    public async Task<List<User>> GetSpecialistsAsync()
    {
        return await _repo.GetSpecialistsAsync();
    }

    public async Task<List<User>> GetAllSpecialistsAsync()
    {
        return await _repo.GetAllSpecialistsAsync();
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        return await _repo.FindByIdAsync(id);
    }

    public async Task<List<User>> GetAllAsync(string? role, string? status)
    {
        return await _repo.GetAllAsync(role, status);
    }

    public async Task<(bool, string)> UpdateRoleAsync(string userId, string newRole, string? bossId)
    {
        var allowed = new[] { "WORKER", "SPECIALIST", "BOSS" };

        if (string.IsNullOrWhiteSpace(newRole))
            return (false, "Role is required");

        newRole = newRole.Trim().ToUpper();

        if (!allowed.Contains(newRole))
            return (false, "Invalid role");

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id not found");

        if (userId == bossId)
            return (false, "You cannot change your own role");

        var user = await _repo.FindByIdAsync(userId);
        if (user == null)
            return (false, "User not found");

        await _repo.UpdateRoleAsync(userId, newRole);

        return (true, "Role updated");
    }

    public async Task<(bool, string)> UpdateStatusAsync(string userId, string newStatus, string? bossId)
    {
        var allowed = new[] { "ACTIVE", "INACTIVE" };

        if (string.IsNullOrWhiteSpace(newStatus))
            return (false, "Account status is required");

        newStatus = newStatus.Trim().ToUpper();

        if (!allowed.Contains(newStatus))
            return (false, "Invalid status");

        if (string.IsNullOrWhiteSpace(bossId))
            return (false, "Boss id not found");

        if (userId == bossId)
            return (false, "You cannot deactivate yourself");

        var user = await _repo.FindByIdAsync(userId);
        if (user == null)
            return (false, "User not found");

        if (newStatus == "INACTIVE" && user.RoleInSystem == "SPECIALIST")
        {
            // здесь следующим шагом добавим обработку заявок специалиста
            // await _orderService.HandleSpecialistDeactivationAsync(userId);
        }

        await _repo.UpdateAccountStatusAsync(userId, newStatus);

        return (true, "Status updated");
    }
}