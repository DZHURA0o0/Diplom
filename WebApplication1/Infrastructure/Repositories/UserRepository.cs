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
}