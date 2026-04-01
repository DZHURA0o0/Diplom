using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace WebApplication1.Domain;

[BsonIgnoreExtraElements]
public class ComplaintInfo
{
    [BsonElement("is_submitted")]
    public bool IsSubmitted { get; set; }

    [BsonElement("text")]
    public string? Text { get; set; }

    [BsonElement("created_at")]
    public DateTime? CreatedAt { get; set; }

    [BsonElement("resolved_by_report_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? ResolvedByReportId { get; set; }
}