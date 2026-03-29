using MongoDB.Bson;

public class OrderDto
{
    public string Id { get; set; } = null!;
    public string WorkerId { get; set; } = null!;
    public string? SpecialistId { get; set; }

    public string? WorkReportText { get; set; }

    public string ServiceType { get; set; } = null!;
    public string DescriptionProblem { get; set; } = null!;

    public string? InspectionResult { get; set; }
    public DateTime? InspectionAt { get; set; }

    public int ProductionWorkshopNumber { get; set; }
    public int FloorNumber { get; set; }
    public int RoomNumber { get; set; }

    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public BsonDocument Complaint { get; set; } = new();
}