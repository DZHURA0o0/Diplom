using MongoDB.Driver;

namespace WebApplication1.Repositories;

public class UserRepository
{
    private readonly IMongoCollection<User> _users;

    public UserRepository(IMongoDatabase db)
    {
        _users = db.GetCollection<User>("users");
    }

    public Task<User?> FindByLoginAsync(string login)
    {
        return _users.Find(x => x.Login == login).FirstOrDefaultAsync();
    }

    public async Task<bool> ExistsByLoginAsync(string login)
    {
        return await _users.Find(x => x.Login == login).AnyAsync();
    }

    public async Task<bool> ExistsByPassNumberAsync(int passNumber)
    {
        return await _users.Find(x => x.PassNumber == passNumber).AnyAsync();
    }

    public async Task CreateAsync(User user)
    {
        await _users.InsertOneAsync(user);
    }

    public Task UpdatePasswordHashAsync(string id, string newHash)
    {
        var filter = Builders<User>.Filter.Eq(x => x.Id, id);

        var update = Builders<User>.Update
            .Set(x => x.PasswordHash, newHash);

        return _users.UpdateOneAsync(filter, update);
    }

    public Task<User?> FindByIdAsync(string id)
    {
        return _users.Find(x => x.Id == id).FirstOrDefaultAsync();
    }

    public async Task<List<User>> GetByRoleAsync(string role)
    {
        return await _users
            .Find(x => x.RoleInSystem == role && x.AccountStatus == "ACTIVE")
            .SortBy(x => x.FullName)
            .ToListAsync();
    }

    public async Task<List<User>> GetWorkersAsync()
    {
        return await _users
            .Find(x => x.RoleInSystem == "WORKER" && x.AccountStatus == "ACTIVE")
            .SortBy(x => x.FullName)
            .ToListAsync();
    }

    public async Task<List<User>> GetSpecialistsAsync()
    {
        return await _users
            .Find(x => x.RoleInSystem == "SPECIALIST" && x.AccountStatus == "ACTIVE")
            .SortBy(x => x.FullName)
            .ToListAsync();
    }

    public async Task<List<User>> GetAllAsync(string? role, string? status)
    {
        var filter = Builders<User>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(role))
        {
            filter &= Builders<User>.Filter.Eq(x => x.RoleInSystem, role);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            filter &= Builders<User>.Filter.Eq(x => x.AccountStatus, status);
        }

        return await _users
            .Find(filter)
            .SortBy(x => x.FullName)
            .ToListAsync();
    }

    public async Task UpdateRoleAsync(string id, string role)
    {
        var filter = Builders<User>.Filter.Eq(x => x.Id, id);

        var update = Builders<User>.Update
            .Set(x => x.RoleInSystem, role);

        await _users.UpdateOneAsync(filter, update);
    }

    public async Task UpdateAccountStatusAsync(string id, string status)
    {
        var filter = Builders<User>.Filter.Eq(x => x.Id, id);

        var update = Builders<User>.Update
            .Set(x => x.AccountStatus, status);

        await _users.UpdateOneAsync(filter, update);
    }
public async Task<List<User>> GetAllSpecialistsAsync()
{
    return await _users
        .Find(x => x.RoleInSystem == "SPECIALIST")
        .SortBy(x => x.FullName)
        .ToListAsync();
}

}