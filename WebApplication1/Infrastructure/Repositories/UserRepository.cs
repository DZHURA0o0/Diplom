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

    public Task UpdatePasswordHashAsync(string id, string newHash)
    {
        var filter = Builders<User>.Filter.Eq(x => x.Id, id);

        var update = Builders<User>.Update
            .Set(x => x.PasswordHash, newHash);

        return _users.UpdateOneAsync(filter, update);
    }
}