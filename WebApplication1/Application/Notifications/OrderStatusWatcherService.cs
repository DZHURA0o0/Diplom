using MongoDB.Bson;
using MongoDB.Driver;

namespace WebApplication1.Application.Services.Notifications;

public class OrderStatusWatcherService : BackgroundService
{
    private readonly IMongoDatabase _database;
    private readonly EmailNotificationService _emailNotificationService;
    private readonly ILogger<OrderStatusWatcherService> _logger;

    public OrderStatusWatcherService(
        IMongoDatabase database,
        EmailNotificationService emailNotificationService,
        ILogger<OrderStatusWatcherService> logger)
    {
        _database = database;
        _emailNotificationService = emailNotificationService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var orders = _database.GetCollection<BsonDocument>("orders");

        var pipeline = new EmptyPipelineDefinition<ChangeStreamDocument<BsonDocument>>()
            .Match(change =>
                change.OperationType == ChangeStreamOperationType.Update ||
                change.OperationType == ChangeStreamOperationType.Replace
            );

        var options = new ChangeStreamOptions
        {
            FullDocument = ChangeStreamFullDocumentOption.UpdateLookup
        };

        _logger.LogInformation("OrderStatusWatcherService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var cursor = await orders.WatchAsync(
                    pipeline,
                    options,
                    cancellationToken: stoppingToken
                );

                await cursor.ForEachAsync(async change =>
                {
                    await HandleOrderChange(change, stoppingToken);
                }, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OrderStatusWatcherService error. Restarting in 5 seconds...");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
            }
        }
    }

    private async Task HandleOrderChange(
        ChangeStreamDocument<BsonDocument> change,
        CancellationToken cancellationToken)
    {
        var fullDocument = change.FullDocument;

        if (fullDocument == null)
        {
            return;
        }

        if (change.OperationType == ChangeStreamOperationType.Update)
        {
            var updatedFields = change.UpdateDescription?.UpdatedFields;

            if (updatedFields == null || !updatedFields.Contains("status"))
            {
                return;
            }
        }

        var orderId = GetObjectIdAsString(fullDocument, "_id");
        var specialistId = GetObjectIdAsString(fullDocument, "specialist_id");
        var status = GetStringValue(fullDocument, "status");

        if (string.IsNullOrWhiteSpace(orderId) ||
            string.IsNullOrWhiteSpace(specialistId) ||
            string.IsNullOrWhiteSpace(status))
        {
            return;
        }

        await _emailNotificationService.NotifySpecialistAboutOrderStatusAsync(
            orderId,
            specialistId,
            status,
            cancellationToken
        );

        _logger.LogInformation(
            "Order status email notification processed. OrderId={OrderId}, SpecialistId={SpecialistId}, Status={Status}",
            orderId,
            specialistId,
            status
        );
    }

    private static string GetStringValue(BsonDocument document, string fieldName)
    {
        if (!document.Contains(fieldName) || document[fieldName].IsBsonNull)
        {
            return "";
        }

        return document[fieldName].AsString;
    }

    private static string GetObjectIdAsString(BsonDocument document, string fieldName)
    {
        if (!document.Contains(fieldName) || document[fieldName].IsBsonNull)
        {
            return "";
        }

        var value = document[fieldName];

        if (value.IsObjectId)
        {
            return value.AsObjectId.ToString();
        }

        return value.ToString();
    }
}