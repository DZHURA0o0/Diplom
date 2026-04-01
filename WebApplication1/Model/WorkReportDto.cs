namespace WebApplication1.Models;

public class WorkReportDto
{
    public string Id { get; set; } = null!;
    public string OrderId { get; set; } = null!;
    public string SpecialistId { get; set; } = null!;
    public string ReportText { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}