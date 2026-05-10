namespace WebApplication1.Models;

public class SpecialistPanelAnalyticsDto
{
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }

    public SpecialistAnalyticsSummaryDto Personal { get; set; } = new();
    public SpecialistAnalyticsSummaryDto Department { get; set; } = new();
    public SpecialistAnalyticsComparisonDto Comparison { get; set; } = new();

    public List<SpecialistStatusAnalyticsDto> PersonalStatuses { get; set; } = new();
    public List<SpecialistStatusAnalyticsDto> DepartmentStatuses { get; set; } = new();

    public SpecialistWorkerActivityDto? PersonalTopRequester { get; set; }
    public SpecialistWorkerActivityDto? PersonalTopComplainer { get; set; }

    public SpecialistWorkerActivityDto? DepartmentTopRequester { get; set; }
    public SpecialistWorkerActivityDto? DepartmentTopComplainer { get; set; }
}

public class SpecialistAnalyticsSummaryDto
{
    public int TotalOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int ActiveOrders { get; set; }
    public int ComplaintsCount { get; set; }
    public int ReworkCount { get; set; }

    public double CompletionRatePercent { get; set; }
    public double ComplaintRatePercent { get; set; }
    public double ReworkRatePercent { get; set; }
}

public class SpecialistAnalyticsComparisonDto
{
    public double PersonalCompletedSharePercent { get; set; }
    public double PersonalOrdersSharePercent { get; set; }

    public double CompletionRateDifferencePercent { get; set; }
    public double ComplaintRateDifferencePercent { get; set; }

    public int DepartmentSpecialistsCount { get; set; }
    public int DepartmentSpecialistsWithOrdersCount { get; set; }

    public double AverageOrdersPerSpecialist { get; set; }
    public double AverageCompletedPerSpecialist { get; set; }
}

public class SpecialistStatusAnalyticsDto
{
    public string Status { get; set; } = null!;
    public int Count { get; set; }
    public double SharePercent { get; set; }
}

public class SpecialistWorkerActivityDto
{
    public string WorkerId { get; set; } = null!;
    public string FullName { get; set; } = null!;

    public int OrdersCount { get; set; }
    public int CompletedCount { get; set; }
    public int ActiveCount { get; set; }
    public int ComplaintsCount { get; set; }

    public double OrdersSharePercent { get; set; }
    public double ComplaintRatePercent { get; set; }
    public double ComplaintSharePercent { get; set; }
}