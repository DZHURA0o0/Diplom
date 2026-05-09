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
        var complaintStatus = GetComplaintStatus(order);

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

    private static string? GetComplaintStatus(WebApplication1.Domain.Order order)
    {
        var complaint = order.Complaint;

        if (complaint == null || !complaint.IsSubmitted)
            return null;

        if (complaint.ClosedAt != null &&
            !string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
        {
            return "RESOLVED";
        }

        if (complaint.ClosedAt != null &&
            string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
        {
            return "REJECTED";
        }

        if (Normalize(order.Status) == "REWORK_REVIEW")
        {
            return "REWORK_DONE";
        }

        if (Normalize(order.Status) == "REWORK")
        {
            return "IN_REWORK";
        }

        if (Normalize(order.Status) == "UNDER_COMPLAINT")
        {
            return "SUBMITTED";
        }

        if (!string.IsNullOrWhiteSpace(complaint.ResolvedByReportId))
        {
            return "REWORK_DONE";
        }

        return "SUBMITTED";
    }

    private static string Normalize(string? value)
    {
        return (value ?? "").Trim().ToUpperInvariant();
    }
}