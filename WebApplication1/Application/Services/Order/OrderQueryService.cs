using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class OrderQueryService
{
    private readonly OrderRepository _repo;
    private readonly WorkReportRepository _workReports;
    private readonly DetailRequestRepository _detailRequests;

    public OrderQueryService(
        OrderRepository repo,
        WorkReportRepository workReports,
        DetailRequestRepository detailRequests)
    {
        _repo = repo;
        _workReports = workReports;
        _detailRequests = detailRequests;
    }

    public async Task<List<OrderDto>> GetByWorkerAsync(string workerId, string? status)
    {
        var orders = await _repo.GetByWorkerAsync(workerId, status);
        var result = new List<OrderDto>();

        foreach (var order in orders)
        {
            result.Add(await MapAsync(order));
        }

        return result;
    }

    public async Task<List<OrderDto>> GetAllAsync(string? status)
    {
        var orders = await _repo.GetAllAsync(status);
        var result = new List<OrderDto>();

        foreach (var order in orders)
        {
            result.Add(await MapAsync(order));
        }

        return result;
    }

    public async Task<List<OrderDto>> GetBySpecialistAsync(string specialistId, string? status)
    {
        var orders = await _repo.GetBySpecialistAsync(specialistId, status);
        var result = new List<OrderDto>();

        foreach (var order in orders)
        {
            result.Add(await MapAsync(order));
        }

        return result;
    }

    public async Task<Order?> GetByIdAsync(string id)
    {
        return await _repo.GetByIdAsync(id);
    }

    private async Task<OrderDto> MapAsync(Order order)
    {
        var dto = OrderMapper.ToDto(order);

        if (!string.IsNullOrWhiteSpace(order.LastWorkReportId))
        {
            var report = await _workReports.GetByIdAsync(order.LastWorkReportId);
            if (report != null)
                dto.WorkReportText = report.ReportText;
        }

        var detailIds = OrderMapper.GetAllDetailRequestIds(order);

        var detailRequests = new List<DetailRequest>();

        if (detailIds.Count > 0)
        {
            detailRequests = await _detailRequests.GetByIdsAsync(detailIds);
        }
        else
        {
            // Підстраховка для випадку, якщо старі дані мають тільки order_id у detail_requests.
            detailRequests = await _detailRequests.GetByOrderIdAsync(order.Id);
        }

        dto.DetailRequests = detailRequests
            .OrderByDescending(x => x.CreatedAt)
            .Select(OrderMapper.ToDto)
            .ToList();

        var lastRequest = detailRequests
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefault();

        if (lastRequest != null)
        {
            dto.DetailRequestId = lastRequest.Id;
            dto.DetailNeeds = lastRequest.DetailNeeds;
            dto.DetailExplanation = lastRequest.Explanation;
            dto.DetailRequestStatus = lastRequest.Status;
        }

        dto.LastWorkReportId = order.LastWorkReportId;

        return dto;
    }
}