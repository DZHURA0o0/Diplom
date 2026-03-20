using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

public class DetailRequestRepository
{
    private readonly IMongoCollection<DetailRequest> _detailRequests;

    public DetailRequestRepository(IMongoDatabase db)
    {
        _detailRequests = db.GetCollection<DetailRequest>("detail_requests");
    }

    public async Task CreateAsync(DetailRequest request)
    {
        await _detailRequests.InsertOneAsync(request);
    }

    public async Task<DetailRequest?> GetByIdAsync(string id)
    {
        return await _detailRequests
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();
    }
}