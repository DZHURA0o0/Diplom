using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers.WorkerPageControllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly OrderService _orderService;

    public OrdersController(OrderService orderService)
    {
        _orderService = orderService;
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(string id)
    {
        var order = await _orderService.GetByIdAsync(id);

        if (order == null)
            return NotFound(new { message = "Order not found" });

        return Ok(new
        {
            id = order.Id,
            workerId = order.WorkerId,
            specialistId = order.SpecialistId,
            detailRequestId = order.DetailRequestId,
            lastWorkReportId = order.LastWorkReportId,
            status = order.Status,
            serviceType = order.ServiceType,
            descriptionProblem = order.DescriptionProblem,
            inspectionResult = order.InspectionResult,
            inspectionAt = order.InspectionAt,
            productionWorkshopNumber = order.ProductionWorkshopNumber,
            floorNumber = order.FloorNumber,
            roomNumber = order.RoomNumber,
            createdAt = order.CreatedAt,
            complaint = order.Complaint == null ? null : new
            {
                isSubmitted = order.Complaint.IsSubmitted,
                text = order.Complaint.Text,
                createdAt = order.Complaint.CreatedAt,
                resolvedByReportId = order.Complaint.ResolvedByReportId
            }
        });
    }
}