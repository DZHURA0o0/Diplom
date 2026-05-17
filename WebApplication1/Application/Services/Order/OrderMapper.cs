using WebApplication1.Domain;
using WebApplication1.Models;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Order;

public static class OrderMapper
{
    public static OrderDto ToDto(DomainOrder order)
    {
        return new OrderDto
        {
            Id = order.Id,
            WorkerId = order.WorkerId,
            SpecialistId = order.SpecialistId,

            DetailRequestId = order.DetailRequestId,
            DetailRequestIds = GetAllDetailRequestIds(order),

            LastWorkReportId = order.LastWorkReportId,

            ServiceType = order.ServiceType,
            DescriptionProblem = order.DescriptionProblem,

            InspectionResult = order.InspectionResult,
            InspectionAt = order.InspectionAt,

            ProductionWorkshopNumber = order.ProductionWorkshopNumber,
            FloorNumber = order.FloorNumber,
            RoomNumber = order.RoomNumber,

            Status = order.Status,
            CreatedAt = order.CreatedAt,

            Complaint = order.Complaint == null
                ? null
                : new ComplaintDto
                {
                    IsSubmitted = order.Complaint.IsSubmitted,
                    Text = order.Complaint.Text,
                    CreatedAt = order.Complaint.CreatedAt,
                    ResolvedByReportId = order.Complaint.ResolvedByReportId,
                    ClosedAt = order.Complaint.ClosedAt,
                    ClosedBy = order.Complaint.ClosedBy,
                    CloseComment = order.Complaint.CloseComment
                }
        };
    }

    public static List<string> GetAllDetailRequestIds(DomainOrder order)
    {
        var ids = new List<string>();

        if (!string.IsNullOrWhiteSpace(order.DetailRequestId))
            ids.Add(order.DetailRequestId.Trim());

        if (order.DetailRequestIds != null)
        {
            ids.AddRange(
                order.DetailRequestIds
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Select(x => x.Trim())
            );
        }

        return ids
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    public static DetailRequestDto ToDto(DetailRequest request)
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

    private static string NormalizeDetailRequestStatus(string? status)
    {
        var normalized = (status ?? "").Trim().ToUpperInvariant();
        return normalized switch
        {
            "REJECTED" => "CANCELED",
            "RESERVED" => "WAITING",
            _ => normalized
        };
    }
}
