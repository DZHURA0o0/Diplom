using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public static class OrderMapper
{
    public static OrderDto ToDto(Order order)
    {
        return new OrderDto
        {
            Id = order.Id,
            WorkerId = order.WorkerId,
            SpecialistId = order.SpecialistId,

            DetailRequestId = order.DetailRequestId,
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
                    ResolvedByReportId = order.Complaint.ResolvedByReportId
                }
        };
    }
}