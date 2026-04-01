using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

public class OrderRepository
{
    private readonly IMongoCollection<Order> _orders;

    public OrderRepository(IMongoDatabase db)
    {
        _orders = db.GetCollection<Order>("orders");
    }

    public Task<List<Order>> GetByWorkerAsync(string workerId, string? status)
    {
        var filter = Builders<Order>.Filter.Eq(x => x.WorkerId, workerId);

        if (!string.IsNullOrWhiteSpace(status))
            filter &= Builders<Order>.Filter.Eq(x => x.Status, status);

        return _orders
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public Task<List<Order>> GetAllAsync(string? status)
    {
        var filter = Builders<Order>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(status))
            filter = Builders<Order>.Filter.Eq(x => x.Status, status);

        return _orders
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<Order?> GetByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        return await _orders
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task CreateAsync(Order order)
    {
        await _orders.InsertOneAsync(order);
    }

    public async Task UpdateAsync(Order order)
    {
        await _orders.ReplaceOneAsync(
            x => x.Id == order.Id,
            order
        );
    }

    public Task<List<Order>> GetBySpecialistAsync(string specialistId, string? status)
    {
        var filter = Builders<Order>.Filter.Eq(x => x.SpecialistId, specialistId);

        if (!string.IsNullOrWhiteSpace(status))
            filter &= Builders<Order>.Filter.Eq(x => x.Status, status);

        return _orders
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }
}