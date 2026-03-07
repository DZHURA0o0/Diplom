using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Domain;

[BsonIgnoreExtraElements]   // чтобы другие лишние поля тоже не ломали
public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("worker_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkerId { get; set; } = null!;

    // ✅ добавляем specialist_id
    [BsonElement("specialist_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? SpecialistId { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = null!;

    [BsonElement("service_type")]
    public string ServiceType { get; set; } = null!;

    [BsonElement("description_problem")]
    public string DescriptionProblem { get; set; } = null!;

    [BsonElement("floor_number")]
    public int FloorNumber { get; set; }

    [BsonElement("room_number")]
    public int RoomNumber { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; }
}