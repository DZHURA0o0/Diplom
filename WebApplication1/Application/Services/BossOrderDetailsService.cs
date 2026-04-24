using WebApplication1.Models;
using WebApplication1.Repositories;

namespace WebApplication1.Application.Services.Boss;

public class BossOrderDetailsService
{
    private readonly OrderRepository _orders;
    private readonly UserRepository _users;
    private readonly DetailRequestRepository _detailRequests;
    private readonly WorkReportRepository _workReports;

    public BossOrderDetailsService(
        OrderRepository orders,
        UserRepository users,
        DetailRequestRepository detailRequests,
        WorkReportRepository workReports)
    {
        _orders = orders;
        _users = users;
        _detailRequests = detailRequests;
        _workReports = workReports;
    }

    public async Task<BossOrderDetailsDto?> GetDetailsAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
            return null;

        var order = await _orders.GetByIdAsync(id);
        if (order == null)
            return null;

        var worker = await _users.FindByIdAsync(order.WorkerId);

        var specialist = !string.IsNullOrWhiteSpace(order.SpecialistId)
            ? await _users.FindByIdAsync(order.SpecialistId)
            : null;

        var detailRequest = !string.IsNullOrWhiteSpace(order.DetailRequestId)
            ? await _detailRequests.GetByIdAsync(order.DetailRequestId)
            : null;

        var workReport = !string.IsNullOrWhiteSpace(order.LastWorkReportId)
            ? await _workReports.GetByIdAsync(order.LastWorkReportId)
            : null;

        var complaintSubmitted = order.Complaint?.IsSubmitted ?? false;
        var complaintText = order.Complaint?.Text;
        string? complaintStatus = null;

        if (complaintSubmitted)
        {
            if (!string.IsNullOrWhiteSpace(order.Complaint?.ResolvedByReportId))
                complaintStatus = "RESOLVED";
            else if (Normalize(order.Status) == "REWORK")
                complaintStatus = "IN_REWORK";
            else
                complaintStatus = "SUBMITTED";
        }

        return new BossOrderDetailsDto
        {
            Id = order.Id,
            Status = order.Status,
            ServiceType = order.ServiceType,
            DescriptionProblem = order.DescriptionProblem,
            InspectionResult = order.InspectionResult,
            ProductionWorkshopNumber = order.ProductionWorkshopNumber,
            FloorNumber = order.FloorNumber,
            RoomNumber = order.RoomNumber,
            CreatedAt = order.CreatedAt,

            WorkerFullName = worker?.FullName ?? "—",
            WorkerPhone = worker?.Phone,
            WorkerPosition = worker?.Position,

            SpecialistFullName = specialist?.FullName,
            SpecialistPhone = specialist?.Phone,
            SpecialistPosition = specialist?.Position,

            DetailNeeds = detailRequest?.DetailNeeds,
            DetailExplanation = detailRequest?.Explanation,

            WorkReportText = workReport?.ReportText,

            ComplaintSubmitted = complaintSubmitted,
            ComplaintId = null,
            ComplaintText = complaintText,
            ComplaintStatus = complaintStatus
        };
    }

    private static string Normalize(string? value)
    {
        return (value ?? "").Trim().ToUpperInvariant();
    }
}