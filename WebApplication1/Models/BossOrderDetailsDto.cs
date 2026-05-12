namespace WebApplication1.Models;

public class BossOrderDetailsDto
{
    public string? Id { get; set; }
    public string? Status { get; set; }
    public string? ServiceType { get; set; }
    public string? DescriptionProblem { get; set; }
    public string? InspectionResult { get; set; }

    public int ProductionWorkshopNumber { get; set; }
    public int FloorNumber { get; set; }
    public int RoomNumber { get; set; }

    public DateTime CreatedAt { get; set; }

    public string? WorkerFullName { get; set; }
    public string? WorkerPhone { get; set; }
    public string? WorkerPosition { get; set; }

    public string? SpecialistFullName { get; set; }
    public string? SpecialistPhone { get; set; }
    public string? SpecialistPosition { get; set; }

    // Старі поля лишаємо для сумісності.
    public string? DetailNeeds { get; set; }
    public string? DetailExplanation { get; set; }

    // Нова логіка: історія всіх запитів деталей.
    public List<string> DetailRequestIds { get; set; } = new();
    public List<DetailRequestDto> DetailRequests { get; set; } = new();

    public string? WorkReportText { get; set; }

    public bool ComplaintSubmitted { get; set; }
    public string? ComplaintId { get; set; }
    public string? ComplaintText { get; set; }
    public string? ComplaintStatus { get; set; }
}
