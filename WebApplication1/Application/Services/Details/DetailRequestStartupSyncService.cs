using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace WebApplication1.Application.Services.Details;

public class DetailRequestStartupSyncService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DetailRequestStartupSyncService> _logger;

    public DetailRequestStartupSyncService(
        IServiceScopeFactory scopeFactory,
        ILogger<DetailRequestStartupSyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var syncService = scope.ServiceProvider.GetRequiredService<DetailRequestStatusSyncService>();

            await syncService.SyncAsync();

            _logger.LogInformation("Detail request startup sync completed.");
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // App is shutting down during startup.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Detail request startup sync failed.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken)
        => Task.CompletedTask;
}
