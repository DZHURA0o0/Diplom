using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace WebApplication1.Application.Services.Details;

public class DetailRequestStatusBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DetailRequestStatusBackgroundService> _logger;

    public DetailRequestStatusBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<DetailRequestStatusBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Detail request status sync service started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();

                var syncService = scope.ServiceProvider
                    .GetRequiredService<DetailRequestStatusSyncService>();

                await syncService.SyncAsync();
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // App is shutting down.
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Detail request status sync error.");
            }

            await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}