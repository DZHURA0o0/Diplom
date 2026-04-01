namespace WebApplication1.Contracts;

public class AddWorkReportRequest
{
    public string ReportText { get; set; } = null!;
    public bool IsRework { get; set; }
}