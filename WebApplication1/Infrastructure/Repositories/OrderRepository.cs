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
}