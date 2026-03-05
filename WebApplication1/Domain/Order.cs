using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Domain;

public class Order
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("worker_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string WorkerId { get; set; } = null!;

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