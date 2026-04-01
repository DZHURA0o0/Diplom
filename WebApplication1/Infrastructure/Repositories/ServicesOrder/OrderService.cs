using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class OrderService
{
    private readonly OrderQueryService _queryService;
    private readonly OrderCommandService _commandService;
    private readonly SpecialistOrderWorkflowService _specialistWorkflowService;
    private readonly WorkReportRepository _workReportRepository;

    public OrderService(
        OrderQueryService queryService,
        OrderCommandService commandService,
        SpecialistOrderWorkflowService specialistWorkflowService,
        WorkReportRepository workReportRepository)
    {
        _queryService = queryService;
        _commandService = commandService;
        _specialistWorkflowService = specialistWorkflowService;
        _workReportRepository = workReportRepository;
    }

    public Task<List<OrderDto>> GetByWorkerAsync(string workerId, string? status)
        => _queryService.GetByWorkerAsync(workerId, status);

    public Task<List<OrderDto>> GetBySpecialistAsync(string specialistId, string? status)
        => _queryService.GetBySpecialistAsync(specialistId, status);

    public Task<List<OrderDto>> GetAllAsync(string? status)
        => _queryService.GetAllAsync(status);

    public Task<Order?> GetByIdAsync(string orderId)
        => _queryService.GetByIdAsync(orderId);

    public Task<(bool ok, string? message, Order? order)> CreateAsync(
        string workerId,
        CreateOrderRequest req)
        => _commandService.CreateAsync(workerId, req);

    public Task<(bool ok, string? message, Order? order)> AssignSpecialistAsync(
        string orderId,
        AssignSpecialistRequest req)
        => _commandService.AssignSpecialistAsync(orderId, req);

    public Task<(bool ok, string? message)> StartWorkAsync(string orderId, string? specialistId)
        => _specialistWorkflowService.StartWorkAsync(orderId, specialistId);

    public Task<(bool ok, string? message)> SaveInspectionAsync(
        string orderId,
        string? specialistId,
        string? inspectionResult)
        => _specialistWorkflowService.SaveInspectionAsync(orderId, specialistId, inspectionResult);

    public Task<(bool ok, string? message)> CreateDetailRequestAsync(
        string orderId,
        string? specialistId,
        string? detailNeeds,
        string? explanation)
        => _specialistWorkflowService.CreateDetailRequestAsync(orderId, specialistId, detailNeeds, explanation);

    public Task<(bool ok, string? message)> MoveToExecutionAsync(string orderId, string? specialistId)
        => _specialistWorkflowService.MoveToExecutionAsync(orderId, specialistId);

    public Task<(bool ok, string? message)> FinishOrderAsync(
        string orderId,
        string? specialistId,
        string? workReportText)
        => _specialistWorkflowService.FinishOrderAsync(orderId, specialistId, workReportText);

    public Task UpdateAsync(Order order)
        => _commandService.UpdateAsync(order);

    public Task<(bool ok, string? message, Order? order)> MoveComplaintToReworkAsync(
        string orderId,
        string bossLogin)
        => _commandService.MoveComplaintToReworkAsync(orderId, bossLogin);

    public Task<(bool ok, string? message, Order? order)> ResolveComplaintAsync(
        string orderId,
        string bossLogin,
        string? comment)
        => _commandService.ResolveComplaintAsync(orderId, bossLogin, comment);

    public Task<(bool ok, string? message, Order? order)> RejectComplaintAsync(
        string orderId,
        string bossLogin,
        string? comment)
        => _commandService.RejectComplaintAsync(orderId, bossLogin, comment);

    public async Task<List<WorkReportDto>> GetReportsByOrderIdAsync(string orderId)
    {
        var reports = await _workReportRepository.GetByOrderIdAsync(orderId);

        return reports.Select(x => new WorkReportDto
        {
            Id = x.Id,
            OrderId = x.OrderId,
            SpecialistId = x.SpecialistId,
            ReportText = x.ReportText,
            CreatedAt = x.CreatedAt
        }).ToList();
    }
}