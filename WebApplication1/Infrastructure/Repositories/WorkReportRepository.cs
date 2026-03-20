using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

public class WorkReportRepository
{
    private readonly IMongoCollection<WorkReport> _reports;

    public WorkReportRepository(IMongoDatabase db)
    {
        _reports = db.GetCollection<WorkReport>("work_reports");
    }

    public async Task CreateAsync(WorkReport report)
    {
        await _reports.InsertOneAsync(report);
    }

    public async Task<WorkReport?> GetByIdAsync(string id)
    {
        return await _reports
            .Find(x => x.Id == id)
            .FirstOrDefaultAsync();
    }
}