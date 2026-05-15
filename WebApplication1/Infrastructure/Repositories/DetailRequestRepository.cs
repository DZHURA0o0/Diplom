using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Infrastructure.Repositories;

public class DetailRequestRepository
{
    private readonly IMongoCollection<DetailRequest> _collection;

    public DetailRequestRepository(IMongoDatabase db)
    {
        _collection = db.GetCollection<DetailRequest>("detail_requests");
    }

    public async Task<DetailRequest?> GetByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        return await _collection
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();
    }

    public async Task<List<DetailRequest>> GetByIdsAsync(IEnumerable<string> ids)
    {
        var cleanIds = ids
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (cleanIds.Count == 0)
            return new List<DetailRequest>();

        return await _collection
            .Find(x => cleanIds.Contains(x.Id))
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<DetailRequest>> GetByOrderIdAsync(string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return new List<DetailRequest>();

        return await _collection
            .Find(x => x.OrderId == orderId)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task<List<DetailRequest>> GetBySpecialistIdAsync(string specialistId, string? status = null)
    {
        if (string.IsNullOrWhiteSpace(specialistId))
            return new List<DetailRequest>();

        var filter = Builders<DetailRequest>.Filter.Eq(x => x.SpecialistId, specialistId);

        if (!string.IsNullOrWhiteSpace(status))
            filter &= Builders<DetailRequest>.Filter.Eq(x => x.Status, status.Trim().ToUpperInvariant());

        return await _collection
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    public async Task CreateAsync(DetailRequest detailRequest)
    {
        await _collection.InsertOneAsync(detailRequest);
    }

    public async Task UpdateAsync(DetailRequest detailRequest)
    {
        await _collection.ReplaceOneAsync(x => x.Id == detailRequest.Id, detailRequest);
    }

    public async Task<List<DetailRequest>> GetPendingDecisionRequestsAsync()
    {
        var statuses = new[]
        {
            "CREATED",
            "RESERVED",
            "APPROVED",
            "CANCELED",
            "REJECTED"
        };

        return await _collection
            .Find(x => statuses.Contains(x.Status))
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }
}
