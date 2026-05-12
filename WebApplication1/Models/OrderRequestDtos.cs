namespace WebApplication1.Models;

public class CreateOrderRequest
{
    public string ServiceType { get; set; } = null!;
    public string DescriptionProblem { get; set; } = null!;
    public int WorkshopNumber { get; set; }
    public int FloorNumber { get; set; }
    public int RoomNumber { get; set; }
}

public class AssignSpecialistRequest
{
    public string? SpecialistId { get; set; }
}

public class InspectionRequest
{
    public string? InspectionResult { get; set; }
}

public class DetailRequestCreateRequest
{
    public string? DetailNeeds { get; set; }
    public string? Explanation { get; set; }
}

public class FinishOrderRequest
{
    public string? WorkReport { get; set; }
}

public class CreateComplaintRequest
{
    public string Text { get; set; } = null!;
}
