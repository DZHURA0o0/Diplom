namespace WebApplication1.Models;

public class AddWorkReportRequest
{
    public string ReportText { get; set; } = null!;
    public bool IsRework { get; set; }
}
