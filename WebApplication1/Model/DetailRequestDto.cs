namespace WebApplication1.Models;

public class DetailRequestDto
{
    public string Id { get; set; } = null!;
    public string OrderId { get; set; } = null!;
    public string SpecialistId { get; set; } = null!;

    public string DetailNeeds { get; set; } = null!;
    public string? Explanation { get; set; }

    public List<string> Photos { get; set; } = new();

    public string Status { get; set; } = null!;

    public string? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }

    public DateTime CreatedAt { get; set; }
}