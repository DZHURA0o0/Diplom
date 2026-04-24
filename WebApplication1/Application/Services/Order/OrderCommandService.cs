using WebApplication1.Models;
using WebApplication1.Repositories;
using DomainOrder = WebApplication1.Domain.Order;
using DomainComplaintInfo = WebApplication1.Domain.ComplaintInfo;

namespace WebApplication1.Application.Services.Order;

public class OrderCommandService
{
    private readonly OrderRepository _orders;
    private readonly UserRepository _users;

    public OrderCommandService(OrderRepository orders, UserRepository users)
    {
        _orders = orders;
        _users = users;
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> CreateAsync(
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

        var order = new DomainOrder
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

            Complaint = new DomainComplaintInfo
            {
                IsSubmitted = false,
                Text = null,
                CreatedAt = null,
                ResolvedByReportId = null
            }
        };

        await _orders.CreateAsync(order);

        return (true, "Order created", order);
    }

    public async Task<(bool ok, string? message, DomainOrder? order)> AssignSpecialistAsync(
        string orderId,
        AssignSpecialistRequest req)
    {
        if (string.IsNullOrWhiteSpace(orderId))
            return (false, "OrderId required", null);

        if (req == null)
            return (false, "Request body required", null);

        var order = await _orders.GetByIdAsync(orderId);
        if (order == null)
            return (false, "Order not found", null);

        if (IsStatus(order, "DONE"))
            return (false, "Cannot reassign completed order", null);

        if (IsStatus(order, "CANCELED"))
            return (false, "Cannot reassign canceled order", null);

        if (string.IsNullOrWhiteSpace(req.SpecialistId))
            return await RemoveSpecialistAsync(order);

        var specialistId = req.SpecialistId.Trim();
        var specialist = await _users.FindByIdAsync(specialistId);

        if (specialist == null)
            return (false, "Specialist not found", null);

        if (!string.Equals(specialist.RoleInSystem, "SPECIALIST", StringComparison.OrdinalIgnoreCase))
            return (false, "Selected user is not a specialist", null);

        if (!string.Equals(specialist.AccountStatus, "ACTIVE", StringComparison.OrdinalIgnoreCase))
            return (false, "Specialist is inactive", null);

        order.SpecialistId = specialistId;
        order.Status = "ASSIGNED";

        await _orders.UpdateAsync(order);

        return (true, "Specialist assigned", order);
    }

    public Task UpdateAsync(DomainOrder order)
    {
        return _orders.UpdateAsync(order);
    }

    public async Task<int> HandleSpecialistDeactivationAsync(string specialistId)
    {
        if (string.IsNullOrWhiteSpace(specialistId))
            return 0;

        var orders = await _orders.GetActiveBySpecialistAsync(specialistId);
        if (orders.Count == 0)
            return 0;

        foreach (var order in orders)
        {
            order.SpecialistId = null;
            order.LastWorkReportId = null;
            order.Status = "NEW";

            await _orders.UpdateAsync(order);
        }

        return orders.Count;
    }

    private async Task<(bool ok, string? message, DomainOrder? order)> RemoveSpecialistAsync(
        DomainOrder order)
    {
        order.SpecialistId = null;
        order.LastWorkReportId = null;
        order.Status = "NEW";

        await _orders.UpdateAsync(order);

        return (true, "Specialist removed", order);
    }

    private static bool IsStatus(DomainOrder order, string status)
    {
        return string.Equals(order.Status, status, StringComparison.OrdinalIgnoreCase);
    }
}