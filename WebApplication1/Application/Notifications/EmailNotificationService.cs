using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MongoDB.Bson;
using MongoDB.Driver;

namespace WebApplication1.Application.Services.Notifications;

public class EmailNotificationService
{
    private readonly IMongoDatabase _database;
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailNotificationService> _logger;

    public EmailNotificationService(
        IMongoDatabase database,
        IConfiguration configuration,
        ILogger<EmailNotificationService> logger)
    {
        _database = database;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendSystemEmailAsync(
        string to,
        string subject,
        string body,
        CancellationToken cancellationToken = default)
    {
        await SendEmailAsync(to, subject, body, cancellationToken);
    }

    public async Task NotifySpecialistAboutOrderStatusAsync(
        string orderId,
        string specialistId,
        string newStatus,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(specialistId))
        {
            return;
        }

        if (!ObjectId.TryParse(specialistId, out var specialistObjectId))
        {
            _logger.LogWarning("Invalid specialist id: {SpecialistId}", specialistId);
            return;
        }

        var users = _database.GetCollection<BsonDocument>("users");

        var specialist = await users
            .Find(Builders<BsonDocument>.Filter.Eq("_id", specialistObjectId))
            .FirstOrDefaultAsync(cancellationToken);

        if (specialist == null)
        {
            _logger.LogWarning("Specialist not found. SpecialistId={SpecialistId}", specialistId);
            return;
        }

        var email = GetStringValue(specialist, "email");

        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning("Specialist has no email. SpecialistId={SpecialistId}", specialistId);
            return;
        }

        var fullName = GetStringValue(specialist, "full_name");
        var statusText = FormatStatus(newStatus);

        var subject = $"Оновлення статусу заявки #{orderId}";

        var body = $"""
        Добрий день{FormatNamePart(fullName)}.

        Статус призначеної вам заявки було змінено.

        Номер заявки: {orderId}
        Новий статус: {statusText}

        Перейдіть до панелі спеціаліста, щоб переглянути актуальну інформацію щодо заявки.

        Support System
        """;

        await SendEmailAsync(email, subject, body, cancellationToken);
    }

    private async Task SendEmailAsync(
        string to,
        string subject,
        string body,
        CancellationToken cancellationToken = default)
    {
        var from = _configuration["Email:From"];
        var senderName = _configuration["Email:SenderName"] ?? "Support System";
        var host = _configuration["Email:SmtpHost"];
        var portText = _configuration["Email:SmtpPort"];
        var username = _configuration["Email:Username"];
        var password = _configuration["Email:Password"];

        if (string.IsNullOrWhiteSpace(from) ||
            string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(portText) ||
            string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning("Email settings are not configured correctly.");
            return;
        }

        if (!int.TryParse(portText, out var port))
        {
            port = 587;
        }

        var message = new MimeMessage();

        message.From.Add(new MailboxAddress(senderName, from));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;

        message.Body = new TextPart("plain")
        {
            Text = body
        };

        using var client = new SmtpClient();

        await client.ConnectAsync(
            host,
            port,
            SecureSocketOptions.StartTls,
            cancellationToken
        );

        await client.AuthenticateAsync(
            username,
            password,
            cancellationToken
        );

        await client.SendAsync(message, cancellationToken);
        await client.DisconnectAsync(true, cancellationToken);

        _logger.LogInformation("Email notification sent to {Email}", to);
    }

    private static string GetStringValue(BsonDocument document, string fieldName)
    {
        if (!document.Contains(fieldName) || document[fieldName].IsBsonNull)
        {
            return "";
        }

        return document[fieldName].AsString;
    }

    private static string FormatNamePart(string fullName)
    {
        return string.IsNullOrWhiteSpace(fullName)
            ? ""
            : $", {fullName}";
    }

    private static string FormatStatus(string status)
    {
        return status switch
        {
            "NEW" => "Нова",
            "ASSIGNED" => "Призначена",
            "IN_PROGRESS" => "У роботі",
            "INSPECTION" => "На перевірці",
            "WAITING_DETAILS" => "Очікує деталей",
            "EXECUTION" => "На виконанні",
            "REWORK" => "На переробці",
            "DONE" => "Виконана",
            "CANCELED" => "Скасована",
            _ => status
        };
    }
}