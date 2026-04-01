using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class OrderCommandService
{
    private readonly OrderRepository _repo;
    private readonly UserRepository _users;

    public OrderCommandService(OrderRepository repo, UserRepository users)
    {
        _repo = repo;
        _users = users;
    }

    public async Task<(bool ok, string? message, Order? order)> CreateAsync(
        string workerId,
        CreateOrderRequest req)
    {
        if (string.IsNullOrWhiteSpace(workerId))
            return (false, "Unauthorized", null);

        if (req == null)
            return (false, "Request body required", null);

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
            LastWorkReportId = null,
            ServiceType = req.ServiceType.Trim().ToUpperInvariant(),
            DescriptionProblem = req.DescriptionProblem.Trim(),
            InspectionResult = null,
            InspectionAt = null,
            ProductionWorkshopNumber = req.WorkshopNumber,
            FloorNumber = req.FloorNumber,
            RoomNumber = req.RoomNumber,
            Status = "NEW",
            CreatedAt = DateTime.UtcNow,
            Complaint = new WebApplication1.Domain.ComplaintInfo
            {
                IsSubmitted = false,
                Text = null,
                CreatedAt = null,
                ResolvedByReportId = null
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

        var currentStatus = Normalize(order.Status);

        if (currentStatus == "DONE")
            return (false, "Cannot reassign completed order", null);

        if (currentStatus == "CANCELED")
            return (false, "Cannot reassign canceled order", null);

        if (string.IsNullOrWhiteSpace(req.SpecialistId))
        {
            order.SpecialistId = null;
            order.LastWorkReportId = null;
            order.Status = "NEW";

            await _repo.UpdateAsync(order);
            return (true, "Specialist removed", order);
        }

        var specialistId = req.SpecialistId.Trim();
        var specialist = await _users.FindByIdAsync(specialistId);

        if (specialist == null)
            return (false, "Specialist not found", null);

        if (Normalize(specialist.RoleInSystem) != "SPECIALIST")
            return (false, "Selected user is not a specialist", null);

        if (Normalize(specialist.AccountStatus) != "ACTIVE")
            return (false, "Specialist is inactive", null);

        order.SpecialistId = specialistId;
        order.Status = "ASSIGNED";

        await _repo.UpdateAsync(order);
        return (true, "Specialist assigned", order);
    }

    public async Task<(bool ok, string? message, Order? order)> MoveComplaintToReworkAsync(
        string orderId,
        string bossLogin)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        var order = await _repo.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Order not found", null);

        if (Normalize(order.Status) != "DONE")
            return (false, "Only DONE order can be moved to REWORK", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return (false, "Complaint already closed", null);

        order.Status = "REWORK";

        await _repo.UpdateAsync(order);
        return (true, "Order moved to rework", order);
    }

    public async Task<(bool ok, string? message, Order? order)> ResolveComplaintAsync(
        string orderId,
        string bossLogin,
        string? comment)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        var order = await _repo.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Order not found", null);

        if (Normalize(order.Status) != "REWORK")
            return (false, "Only REWORK order can resolve complaint", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
            return (false, "Already resolved", null);

        order.Status = "DONE";

        await _repo.UpdateAsync(order);
        return (true, "Complaint marked for resolution", order);
    }

    public async Task<(bool ok, string? message, Order? order)> RejectComplaintAsync(
        string orderId,
        string bossLogin,
        string? comment)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        var order = await _repo.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Order not found", null);

        if (Normalize(order.Status) != "DONE")
            return (false, "Only DONE order can reject complaint", null);

        var complaint = EnsureComplaint(order);

        if (!complaint.IsSubmitted)
            return (false, "Complaint not found", null);

        complaint.IsSubmitted = false;
        complaint.ResolvedByReportId = null;

        await _repo.UpdateAsync(order);
        return (true, "Complaint rejected", order);
    }

    public Task UpdateAsync(Order order)
    {
        return _repo.UpdateAsync(order);
    }

    private static string Normalize(string? value)
    {
        return (value ?? "").Trim().ToUpperInvariant();
    }

    private static WebApplication1.Domain.ComplaintInfo EnsureComplaint(Order order)
    {
        if (order.Complaint == null)
        {
            order.Complaint = new WebApplication1.Domain.ComplaintInfo
            {
                IsSubmitted = false,
                Text = null,
                CreatedAt = null,
                ResolvedByReportId = null
            };
        }

        return order.Complaint;
    }
}