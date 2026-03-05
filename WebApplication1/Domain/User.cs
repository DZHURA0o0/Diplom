using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("full_name")]
    public string FullName { get; set; } = null!;

    [BsonElement("pass_number")]
    public int PassNumber { get; set; }

    [BsonElement("role_in_system")]
    public string RoleInSystem { get; set; } = null!;

    [BsonElement("login")]
    public string Login { get; set; } = null!;

    [BsonElement("password_hash")]
    public string PasswordHash { get; set; } = null!;

    [BsonElement("position")]
    public string Position { get; set; } = null!;

    [BsonElement("phone")]
    public string Phone { get; set; } = null!;

    [BsonElement("email")]
    public string Email { get; set; } = null!;

    [BsonElement("account_status")]
    public string AccountStatus { get; set; } = null!;

    [BsonElement("floor_number")]
    public long FloorNumber { get; set; }

    [BsonElement("office_number")]
    public long OfficeNumber { get; set; }

    [BsonElement("workshop_number")]
    public long WorkshopNumber { get; set; }

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; }
}