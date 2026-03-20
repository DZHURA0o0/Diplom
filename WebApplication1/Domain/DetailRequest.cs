using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Domain;

[BsonIgnoreExtraElements]
public class DetailRequest
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("order_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string OrderId { get; set; } = null!;

    [BsonElement("specialist_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string SpecialistId { get; set; } = null!;

    [BsonElement("detail_needs")]
    public string DetailNeeds { get; set; } = null!;

    [BsonElement("explanation")]
    public string Explanation { get; set; } = null!;

    [BsonElement("photos")]
    public List<string> Photos { get; set; } = new();

    [BsonElement("status")]
    public string Status { get; set; } = "CREATED";

    [BsonElement("approved_by")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ApprovedBy { get; set; }

    [BsonElement("approved_at")]
    public DateTime? ApprovedAt { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; }
}