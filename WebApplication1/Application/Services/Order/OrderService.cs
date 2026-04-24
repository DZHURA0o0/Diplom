using WebApplication1.Application.Services.Complaints;
using WebApplication1.Models;
using WebApplication1.Repositories;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Order;

public class OrderService
{
    private readonly OrderQueryService _queryService;
    private readonly OrderCommandService _commandService;
    private readonly OrderWorkflowService _workflowService;
    private readonly ComplaintService _complaintService;
    private readonly WorkReportRepository _workReportRepository;

    public OrderService(
        OrderQueryService queryService,
        OrderCommandService commandService,
        OrderWorkflowService workflowService,
        ComplaintService complaintService,
        WorkReportRepository workReportRepository)
    {
        _queryService = queryService;
        _commandService = commandService;
        _workflowService = workflowService;
        _complaintService = complaintService;
        _workReportRepository = workReportRepository;
    }

    public Task<List<OrderDto>> GetByWorkerAsync(string workerId, string? status)
        => _queryService.GetByWorkerAsync(workerId, status);

    public Task<List<OrderDto>> GetBySpecialistAsync(string specialistId, string? status)
        => _queryService.GetBySpecialistAsync(specialistId, status);

    public Task<List<OrderDto>> GetAllAsync(string? status)
        => _queryService.GetAllAsync(status);

    public Task<DomainOrder?> GetByIdAsync(string orderId)
        => _queryService.GetByIdAsync(orderId);

    public Task<(bool ok, string? message, DomainOrder? order)> CreateAsync(
        string workerId,
        CreateOrderRequest req)
        => _commandService.CreateAsync(workerId, req);

    public Task<(bool ok, string? message, DomainOrder? order)> AssignSpecialistAsync(
        string orderId,
        AssignSpecialistRequest req)
        => _commandService.AssignSpecialistAsync(orderId, req);

    public Task<(bool ok, string? message)> StartWorkAsync(string orderId, string? specialistId)
        => _workflowService.StartWorkAsync(orderId, specialistId);

    public Task<(bool ok, string? message)> SaveInspectionAsync(
        string orderId,
        string? specialistId,
        string? inspectionResult)
        => _workflowService.SaveInspectionAsync(orderId, specialistId, inspectionResult);

    public Task<(bool ok, string? message)> CreateDetailRequestAsync(
        string orderId,
        string? specialistId,
        string? detailNeeds,
        string? explanation)
        => _workflowService.CreateDetailRequestAsync(orderId, specialistId, detailNeeds, explanation);

    public Task<(bool ok, string? message)> MoveToExecutionAsync(string orderId, string? specialistId)
        => _workflowService.MoveToExecutionAsync(orderId, specialistId);

    public Task<(bool ok, string? message)> FinishOrderAsync(
        string orderId,
        string? specialistId,
        string? workReportText)
        => _workflowService.FinishOrderAsync(orderId, specialistId, workReportText);

    public Task UpdateAsync(DomainOrder order)
        => _commandService.UpdateAsync(order);

    public Task<(bool ok, string? message, DomainOrder? order)> SubmitComplaintByWorkerAsync(
        string orderId,
        string workerId,
        string? text)
        => _complaintService.SubmitByWorkerAsync(orderId, workerId, text);

    public Task<(bool ok, string? message, DomainOrder? order)> MoveComplaintToReworkAsync(
        string orderId,
        string bossId)
        => _complaintService.MoveToReworkAsync(orderId, bossId);

    public Task<(bool ok, string? message, DomainOrder? order)> ResolveComplaintAsync(
        string orderId,
        string bossId,
        string? comment)
        => _complaintService.ResolveAsync(orderId, bossId, comment);

    public Task<(bool ok, string? message, DomainOrder? order)> RejectComplaintAsync(
        string orderId,
        string bossId,
        string? comment)
        => _complaintService.RejectAsync(orderId, bossId, comment);

    public async Task<List<WorkReportDto>> GetReportsByOrderIdAsync(string orderId)
    {
        var reports = await _workReportRepository.GetByOrderIdAsync(orderId);

        return reports
            .Select(x => new WorkReportDto
            {
                Id = x.Id,
                OrderId = x.OrderId,
                SpecialistId = x.SpecialistId,
                ReportText = x.ReportText,
                CreatedAt = x.CreatedAt
            })
            .ToList();
    }
}