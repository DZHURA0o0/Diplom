using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Models;

public class ComplaintInfo
{
    [BsonElement("is_submitted")]
    public bool IsSubmitted { get; set; }

    [BsonElement("complaint_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ComplaintId { get; set; }

    [BsonElement("text")]
    public string? Text { get; set; }

    [BsonElement("created_at")]
    public DateTime? CreatedAt { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "OPEN";

    [BsonElement("closed_at")]
    public DateTime? ClosedAt { get; set; }

    [BsonElement("closed_by")]
    public string? ClosedBy { get; set; }

    [BsonElement("close_comment")]
    public string? CloseComment { get; set; }
}