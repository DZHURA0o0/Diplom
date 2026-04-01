using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Domain;

[BsonIgnoreExtraElements]
public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("worker_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkerId { get; set; } = null!;

    [BsonElement("specialist_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? SpecialistId { get; set; }

    [BsonElement("detail_request_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? DetailRequestId { get; set; }

    [BsonElement("last_work_report_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? LastWorkReportId { get; set; }

    [BsonElement("service_type")]
    public string ServiceType { get; set; } = null!;

    [BsonElement("description_problem")]
    public string DescriptionProblem { get; set; } = null!;

    [BsonElement("inspection_result")]
    public string? InspectionResult { get; set; }

    [BsonElement("inspection_at")]
    public DateTime? InspectionAt { get; set; }

    [BsonElement("production_workshop_number")]
    public int ProductionWorkshopNumber { get; set; }

    [BsonElement("floor_number")]
    public int FloorNumber { get; set; }

    [BsonElement("room_number")]
    public int RoomNumber { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; }

    [BsonElement("complaint")]
    public ComplaintInfo Complaint { get; set; } = new();
}