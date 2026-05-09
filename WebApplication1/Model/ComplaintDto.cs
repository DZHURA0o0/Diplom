namespace WebApplication1.Models;

public class ComplaintDto
{
    public bool IsSubmitted { get; set; }

    public string? Text { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? ResolvedByReportId { get; set; }

    public DateTime? ClosedAt { get; set; }

    public string? ClosedBy { get; set; }

    public string? CloseComment { get; set; }
}