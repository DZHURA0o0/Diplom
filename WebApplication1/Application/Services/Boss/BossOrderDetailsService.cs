using WebApplication1.Domain;
using WebApplication1.Application.Services.Order;
using WebApplication1.Infrastructure.Repositories;
using WebApplication1.Models;
using DomainOrder = WebApplication1.Domain.Order;

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

        var detailRequests = await GetOrderDetailRequestsAsync(order);
        await RecalculateOrderDetailStatusAsync(order, detailRequests);

        var newestDetailRequest = detailRequests
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

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

            // Старі поля — показують останній запит, якщо десь ще використовуються.
            DetailNeeds = newestDetailRequest?.DetailNeeds,
            DetailExplanation = newestDetailRequest?.Explanation,

            DetailRequestIds = detailRequests
                .Select(x => x.Id)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList(),

            DetailRequests = detailRequests
                .OrderByDescending(x => x.CreatedAt)
                .Select(ToDetailRequestDto)
                .ToList(),

            WorkReportText = workReport?.ReportText,

            ComplaintSubmitted = complaintSubmitted,
            ComplaintId = null,
            ComplaintText = complaintText,
            ComplaintStatus = complaintStatus
        };
    }

    private async Task<List<DetailRequest>> GetOrderDetailRequestsAsync(DomainOrder order)
    {
        var ids = OrderMapper.GetAllDetailRequestIds(order);

        var byIds = ids.Count > 0
            ? await _detailRequests.GetByIdsAsync(ids)
            : new List<DetailRequest>();

        var byOrderId = await _detailRequests.GetByOrderIdAsync(order.Id);

        return byIds
            .Concat(byOrderId)
            .GroupBy(x => x.Id)
            .Select(x => x.First())
            .OrderByDescending(x => x.CreatedAt)
            .ToList();
    }

    private static DetailRequestDto ToDetailRequestDto(DetailRequest request)
    {
        return new DetailRequestDto
        {
            Id = request.Id,
            OrderId = request.OrderId,
            SpecialistId = request.SpecialistId,
            DetailNeeds = request.DetailNeeds,
            Explanation = request.Explanation,
            Photos = request.Photos ?? new List<string>(),
            Status = NormalizeDetailRequestStatus(request.Status),
            ApprovedBy = request.ApprovedBy,
            ApprovedAt = request.ApprovedAt,
            CreatedAt = request.CreatedAt
        };
    }

    private async Task RecalculateOrderDetailStatusAsync(
        DomainOrder order,
        List<DetailRequest> requests)
    {
        if (requests.Count == 0 || IsFinalOrComplaintStatus(order))
            return;

        var nextStatus = requests.Any(IsActiveDetailRequest)
            ? "WAITING_DETAILS"
            : "DETAILS_RECEIVED";

        if (Normalize(order.Status) == nextStatus)
            return;

        order.Status = nextStatus;
        await _orders.UpdateAsync(order);
    }

    private static string NormalizeDetailRequestStatus(string? status)
    {
        var normalized = Normalize(status);
        return normalized switch
        {
            "REJECTED" => "CANCELED",
            "RESERVED" => "WAITING",
            _ => normalized
        };
    }

    private static string? GetComplaintStatus(DomainOrder order)
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

    private static bool IsActiveDetailRequest(DetailRequest request)
    {
        var status = NormalizeDetailRequestStatus(request.Status);
        return status == "CREATED" || status == "WAITING";
    }

    private static bool IsFinalOrComplaintStatus(DomainOrder order)
    {
        var status = Normalize(order.Status);
        return status == "CANCELED" ||
               status == "DONE" ||
               status == "UNDER_COMPLAINT" ||
               status == "REWORK" ||
               status == "REWORK_REVIEW";
    }

    private static string Normalize(string? value)
    {
        return (value ?? "").Trim().ToUpperInvariant();
    }
}
