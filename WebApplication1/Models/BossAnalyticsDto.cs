namespace WebApplication1.Models;

public class BossAnalyticsDto
{
    public DateTime PeriodFrom { get; set; }
    public DateTime PeriodTo { get; set; }

    public int TotalOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int CanceledOrders { get; set; }
    public int ActiveOrders { get; set; }

    public int ComplaintsCount { get; set; }
    public int ReworkCount { get; set; }

    public bool IsPersonalized { get; set; }
    public string? SelectedSpecialistId { get; set; }
    public string? SelectedSpecialistName { get; set; }

    // Backward-compatible name. Means average specialist share among completed orders.
    public double AverageEfficiencyPercent { get; set; }
    public double LeaderEfficiencyPercent { get; set; }
    public string? LeaderSpecialistName { get; set; }
    public double LowestEfficiencyPercent { get; set; }
    public string? LowestSpecialistName { get; set; }

    public List<SpecialistAnalyticsDto> Specialists { get; set; } = new();
    public List<ComplainerAnalyticsDto> TopComplainers { get; set; } = new();
    public List<RequesterAnalyticsDto> TopRequesters { get; set; } = new();
    public List<LocationAnalyticsDto> TopLocations { get; set; } = new();
    public List<ServiceTypeAnalyticsDto> ServiceTypes { get; set; } = new();

    public BonusRecommendationDto BonusRecommendation { get; set; } = new();
}

public class SpecialistAnalyticsDto
{
    public string SpecialistId { get; set; } = null!;
    public string FullName { get; set; } = null!;

    public int AssignedCount { get; set; }
    public int CompletedCount { get; set; }
    public int ActiveCount { get; set; }

    public int ComplaintsCount { get; set; }
    public int ReworkCount { get; set; }

    // CompletedCount / AssignedCount * 100
    public double CompletionRatePercent { get; set; }

    // ComplaintsCount / CompletedCount * 100
    public double ComplaintRatePercent { get; set; }

    // CompletedCount specialist / all DONE orders in period * 100
    public double EfficiencyPercent { get; set; }
}

public class ComplainerAnalyticsDto
{
    public string WorkerId { get; set; } = null!;
    public string FullName { get; set; } = null!;

    public int OrdersCount { get; set; }
    public int ComplaintsCount { get; set; }

    // Скарги працівника / усі заявки цього працівника * 100
    public double ComplaintRatePercent { get; set; }

    // Скарги працівника / усі скарги за період * 100
    public double ComplaintSharePercent { get; set; }
}

public class RequesterAnalyticsDto
{
    public string WorkerId { get; set; } = null!;
    public string FullName { get; set; } = null!;

    public int OrdersCount { get; set; }
    public int CompletedCount { get; set; }
    public int ActiveCount { get; set; }
    public int ComplaintsCount { get; set; }

    // Заявки працівника / усі заявки за період * 100
    public double SharePercent { get; set; }
}

public class LocationAnalyticsDto
{
    public int ProductionWorkshopNumber { get; set; }
    public int FloorNumber { get; set; }
    public int RoomNumber { get; set; }

    public int OrdersCount { get; set; }

    // OrdersCount цієї кімнати / усі заявки за період * 100
    public double SharePercent { get; set; }
}

public class ServiceTypeAnalyticsDto
{
    public string ServiceType { get; set; } = null!;

    public int Count { get; set; }
    public double SharePercent { get; set; }
    public int CompletedCount { get; set; }
    public int ComplaintsCount { get; set; }
}

public class BonusRecommendationDto
{
    public bool HasCandidate { get; set; }

    public string? SpecialistId { get; set; }
    public string? FullName { get; set; }

    public double RatingPercent { get; set; }

    public int CompletedCount { get; set; }
    public int AssignedCount { get; set; }
    public int ComplaintsCount { get; set; }

    public double SharePercent { get; set; }
    public double CompletionRatePercent { get; set; }
    public double ComplaintRatePercent { get; set; }

    public string Reason { get; set; } = "Немає достатніх підстав для автоматичної рекомендації на премію за обраний період.";
}
