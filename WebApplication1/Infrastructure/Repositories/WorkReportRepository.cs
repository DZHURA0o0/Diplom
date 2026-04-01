using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

public class WorkReportRepository
{
    private readonly IMongoCollection<WorkReport> _collection;

    public WorkReportRepository(IMongoDatabase db)
    {
        _collection = db.GetCollection<WorkReport>("work_reports");
    }

    public async Task<WorkReport?> GetByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        var item = await _collection
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();

        return item;
    }

    public async Task<List<WorkReport>> GetByOrderIdAsync(string orderId)
    {
        return await _collection
            .Find(x => x.OrderId == orderId)
            .SortBy(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task CreateAsync(WorkReport workReport)
    {
        await _collection.InsertOneAsync(workReport);
    }

    public async Task UpdateAsync(WorkReport workReport)
    {
        await _collection.ReplaceOneAsync(x => x.Id == workReport.Id, workReport);
    }
    
}