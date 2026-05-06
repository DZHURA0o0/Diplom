namespace WebApplication1.Application.Services.Notifications;

public class StartupEmailTestService : BackgroundService
{
    private readonly EmailNotificationService _emailNotificationService;
    private readonly ILogger<StartupEmailTestService> _logger;

    public StartupEmailTestService(
        EmailNotificationService emailNotificationService,
        ILogger<StartupEmailTestService> logger)
    {
        _emailNotificationService = emailNotificationService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(3), stoppingToken);

            await _emailNotificationService.SendSystemEmailAsync(
                "maltsev14022005@gmail.com",
                "Тестове повідомлення Support System",
                """
                Добрий день.

                Це тестове повідомлення від системи Support System.

                Якщо ви отримали цей лист, SMTP-налаштування працюють коректно.

                Support System
                """,
                stoppingToken
            );

            _logger.LogInformation("Startup test email was sent successfully.");
        }
        catch (OperationCanceledException)
        {
            // Приложение остановилось — это не ошибка.
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send startup test email.");
        }
    }
}