using MongoDB.Bson;
using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class OrderService
{
    private readonly OrderRepository _repo;
    private readonly DetailRequestRepository _detailRequestRepo;
    private readonly WorkReportRepository _workReportRepo;

    public OrderService(
        OrderRepository repo,
        DetailRequestRepository detailRequestRepo,
        WorkReportRepository workReportRepo)
    {
        _repo = repo;
        _detailRequestRepo = detailRequestRepo;
        _workReportRepo = workReportRepo;
    }

    // =========================================
    // Worker
    // =========================================

    public async Task<List<Order>> GetByWorkerAsync(string workerId, string? status)
    {
        return await _repo.GetByWorkerAsync(workerId, status);
    }

    // =========================================
    // Boss
    // =========================================

    public async Task<List<Order>> GetAllAsync(string? status)
    {
        return await _repo.GetAllAsync(status);
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
            WorkReportId = null,

            ServiceType = req.ServiceType.Trim().ToUpperInvariant(),
            DescriptionProblem = req.DescriptionProblem.Trim(),

            InspectionResult = null,
            InspectionAt = null,

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

    public async Task<(bool ok, string? message, Order? order)> AssignSpecialistAsync(
        string orderId,
        AssignSpecialistRequest req)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        if (req == null)
            return (false, "Request body required", null);

        var order = await _repo.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found", null);

        if (string.IsNullOrWhiteSpace(req.SpecialistId))
        {
            order.SpecialistId = null;
            order.Status = "NEW";

            await _repo.UpdateAsync(order);

            return (true, "Specialist removed", order);
        }

        order.SpecialistId = req.SpecialistId.Trim();
        order.Status = "ASSIGNED";

        await _repo.UpdateAsync(order);

        return (true, "Specialist assigned", order);
    }

    // =========================================
    // Specialist
    // =========================================

    public async Task<List<Order>> GetBySpecialistAsync(string specialistId, string? status)
    {
        return await _repo.GetBySpecialistAsync(specialistId, status);
    }

    public async Task<Order?> GetByIdAsync(string orderId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return null;

        return await _repo.GetByIdAsync(orderId);
    }

    // ASSIGNED -> IN_PROGRESS
    public async Task<(bool ok, string? message)> StartWorkAsync(string orderId, string? specialistId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Unauthorized");

        var order = await _repo.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found");

        if (order.SpecialistId != specialistId)
            return (false, "This order is not assigned to you");

        if (order.Status != "ASSIGNED")
            return (false, "Only ASSIGNED order can be moved to IN_PROGRESS");

        order.Status = "IN_PROGRESS";

        await _repo.UpdateAsync(order);

        return (true, "Order moved to IN_PROGRESS");
    }

    // IN_PROGRESS -> INSPECTION
    public async Task<(bool ok, string? message)> SaveInspectionAsync(
        string orderId,
        string? specialistId,
        string? inspectionResult)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Unauthorized");

        if (string.IsNullOrWhiteSpace(inspectionResult))
            return (false, "InspectionResult required");

        var order = await _repo.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found");

        if (order.SpecialistId != specialistId)
            return (false, "This order is not assigned to you");

        if (order.Status != "IN_PROGRESS")
            return (false, "Only IN_PROGRESS order can be moved to INSPECTION");

        order.InspectionResult = inspectionResult.Trim();
        order.InspectionAt = DateTime.UtcNow;
        order.Status = "INSPECTION";

        await _repo.UpdateAsync(order);

        return (true, "Inspection saved");
    }

    // INSPECTION -> WAITING_DETAILS
    public async Task<(bool ok, string? message)> CreateDetailRequestAsync(
        string orderId,
        string? specialistId,
        string? detailNeeds,
        string? explanation)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Unauthorized");

        if (string.IsNullOrWhiteSpace(detailNeeds))
            return (false, "Detail needs required");

        if (string.IsNullOrWhiteSpace(explanation))
            return (false, "Explanation required");

        var order = await _repo.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found");

        if (order.SpecialistId != specialistId)
            return (false, "This order is not assigned to you");

        if (order.Status != "INSPECTION")
            return (false, "Only INSPECTION order can be moved to WAITING_DETAILS");

        var detailRequest = new DetailRequest
        {
            OrderId = order.Id,
            SpecialistId = specialistId,
            DetailNeeds = detailNeeds.Trim(),
            Explanation = explanation.Trim(),
            Photos = new List<string>(),
            Status = "CREATED",
            ApprovedBy = null,
            ApprovedAt = null,
            CreatedAt = DateTime.UtcNow
        };

        await _detailRequestRepo.CreateAsync(detailRequest);

        order.DetailRequestId = detailRequest.Id;
        order.Status = "WAITING_DETAILS";

        await _repo.UpdateAsync(order);

        return (true, "Detail request created");
    }

    // INSPECTION -> EXECUTION
    // WAITING_DETAILS -> EXECUTION
    public async Task<(bool ok, string? message)> MoveToExecutionAsync(string orderId, string? specialistId)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Unauthorized");

        var order = await _repo.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found");

        if (order.SpecialistId != specialistId)
            return (false, "This order is not assigned to you");

        if (order.Status != "INSPECTION" && order.Status != "WAITING_DETAILS")
            return (false, "Only INSPECTION or WAITING_DETAILS order can be moved to EXECUTION");

        order.Status = "EXECUTION";

        await _repo.UpdateAsync(order);

        return (true, "Order moved to EXECUTION");
    }

    // EXECUTION -> DONE
    public async Task<(bool ok, string? message)> FinishOrderAsync(
        string orderId,
        string? specialistId,
        string? workReportText)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required");

        if (string.IsNullOrWhiteSpace(specialistId))
            return (false, "Unauthorized");

        if (string.IsNullOrWhiteSpace(workReportText))
            return (false, "Work report required");

        var order = await _repo.GetByIdAsync(orderId);

        if (order == null)
            return (false, "Order not found");

        if (order.SpecialistId != specialistId)
            return (false, "This order is not assigned to you");

        if (order.Status != "EXECUTION")
            return (false, "Only EXECUTION order can be moved to DONE");

        var report = new WorkReport
        {
            OrderId = order.Id,
            SpecialistId = specialistId,
            ReportText = workReportText.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        await _workReportRepo.CreateAsync(report);

        order.WorkReportId = report.Id;
        order.Status = "DONE";

        await _repo.UpdateAsync(order);

        return (true, "Order completed");
    }
}