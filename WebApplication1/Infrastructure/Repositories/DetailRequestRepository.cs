using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

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

        var item = await _collection
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();

        return item;
    }

    public async Task CreateAsync(DetailRequest detailRequest)
    {
        await _collection.InsertOneAsync(detailRequest);
    }

    public async Task UpdateAsync(DetailRequest detailRequest)
    {
        await _collection.ReplaceOneAsync(x => x.Id == detailRequest.Id, detailRequest);
    }
}