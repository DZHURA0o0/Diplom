using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Domain;

[BsonIgnoreExtraElements]
public class WorkReport
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

    [BsonElement("report_text")]
    public string ReportText { get; set; } = null!;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; }
}