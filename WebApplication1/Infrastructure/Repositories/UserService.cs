namespace WebApplication1.Repositories;

public class UserService
{
    private readonly UserRepository _repo;

    public UserService(UserRepository repo)
    {
        _repo = repo;
    }

    public async Task<List<User>> GetWorkersAsync()
    {
        return await _repo.GetWorkersAsync();
    }

    public async Task<List<User>> GetSpecialistsAsync()
    {
        return await _repo.GetSpecialistsAsync();
    }

    public async Task<User?> GetByIdAsync(string id)
    {
        return await _repo.FindByIdAsync(id);
    }
}