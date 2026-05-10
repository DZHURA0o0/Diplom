using MongoDB.Bson;
using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Application.Services.Details;

public class DetailRequestChangeStreamService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMongoDatabase _database;
    private readonly ILogger<DetailRequestChangeStreamService> _logger;

    public DetailRequestChangeStreamService(
        IServiceScopeFactory scopeFactory,
        IMongoDatabase database,
        ILogger<DetailRequestChangeStreamService> logger)
    {
        _scopeFactory = scopeFactory;
        _database = database;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Detail request Change Stream service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await WatchDetailRequestsAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Detail request Change Stream service stopped.");
            }
            catch (MongoCommandException ex)
            {
                _logger.LogError(
                    ex,
                    "MongoDB Change Stream command error. Check that MongoDB deployment supports change streams."
                );

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (MongoException ex)
            {
                _logger.LogError(
                    ex,
                    "MongoDB Change Stream error. Retrying in 10 seconds."
                );

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Unexpected error in DetailRequestChangeStreamService. Retrying in 10 seconds."
                );

                await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken);
            }
        }
    }

    private async Task WatchDetailRequestsAsync(CancellationToken stoppingToken)
    {
        var collection = _database.GetCollection<DetailRequest>("detail_requests");

        var pipeline = new EmptyPipelineDefinition<ChangeStreamDocument<DetailRequest>>()
            .Match(change =>
                change.OperationType == ChangeStreamOperationType.Insert ||
                change.OperationType == ChangeStreamOperationType.Update ||
                change.OperationType == ChangeStreamOperationType.Replace
            );

        var options = new ChangeStreamOptions
        {
            FullDocument = ChangeStreamFullDocumentOption.UpdateLookup,
            MaxAwaitTime = TimeSpan.FromSeconds(5)
        };

        using var cursor = await collection.WatchAsync(
            pipeline,
            options,
            stoppingToken
        );

        _logger.LogInformation("Watching MongoDB collection: detail_requests");

        await cursor.ForEachAsync(
            async change =>
            {
                await HandleChangeAsync(change, stoppingToken);
            },
            stoppingToken
        );
    }

    private async Task HandleChangeAsync(
        ChangeStreamDocument<DetailRequest> change,
        CancellationToken stoppingToken)
    {
        if (stoppingToken.IsCancellationRequested)
            return;

        var detailRequest = change.FullDocument;

        if (detailRequest == null)
        {
            _logger.LogWarning(
                "Change stream event skipped. FullDocument is null. Operation: {OperationType}",
                change.OperationType
            );

            return;
        }

        if (string.IsNullOrWhiteSpace(detailRequest.OrderId))
        {
            _logger.LogWarning(
                "Change stream event skipped. DetailRequest {DetailRequestId} has empty OrderId.",
                detailRequest.Id
            );

            return;
        }

        _logger.LogInformation(
            "Detail request changed. DetailRequestId: {DetailRequestId}, OrderId: {OrderId}, Status: {Status}, Operation: {Operation}",
            detailRequest.Id,
            detailRequest.OrderId,
            detailRequest.Status,
            change.OperationType
        );

        using var scope = _scopeFactory.CreateScope();

        var syncService = scope.ServiceProvider.GetRequiredService<DetailRequestStatusSyncService>();

        await syncService.RecalculateByOrderIdAsync(detailRequest.OrderId);
    }
}