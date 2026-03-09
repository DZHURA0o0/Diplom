using MongoDB.Bson;
using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class OrderService
{
    private readonly OrderRepository _repo;

    public OrderService(OrderRepository repo)
    {
        _repo = repo;
    }

    public async Task<List<Order>> GetByWorkerAsync(string workerId, string? status)
    {
        return await _repo.GetByWorkerAsync(workerId, status);
    }

    public async Task<(bool ok, string? message, Order? order)> CreateAsync(
        string workerId,
        CreateOrderRequest req)
    {
        if (string.IsNullOrWhiteSpace(workerId))
            return (false, "Unauthorized", null);

        if (string.IsNullOrWhiteSpace(req.ServiceType))
            return (false, "ServiceType required", null);

        if (string.IsNullOrWhiteSpace(req.DescriptionProblem))
            return (false, "DescriptionProblem required", null);

        if (req.DescriptionProblem.Trim().Length < 5)
            return (false, "Description too short", null);

        var order = new Order
        {
            WorkerId = workerId,
            SpecialistId = null,
            DetailRequestId = null,
            WorkReportIds = new List<ObjectId>(),

            ServiceType = req.ServiceType.Trim().ToUpperInvariant(),
            DescriptionProblem = req.DescriptionProblem.Trim(),

            InspectionResult = null,

            ProductionWorkshopNumber = req.WorkshopNumber,
            FloorNumber = req.FloorNumber,
            RoomNumber = req.RoomNumber,

            Status = "NEW",
            CreatedAt = DateTime.UtcNow,

            Complaint = new BsonDocument
            {
                { "is_submitted", false },
                { "complaint_id", BsonNull.Value }
            }
        };

        await _repo.CreateAsync(order);

        return (true, "Order created", order);
    }
}