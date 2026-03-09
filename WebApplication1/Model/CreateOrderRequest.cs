namespace WebApplication1.Models;

public class CreateOrderRequest
{
    public string ServiceType { get; set; } = null!;
    public string DescriptionProblem { get; set; } = null!;
    public int WorkshopNumber { get; set; }
    public int FloorNumber { get; set; }
    public int RoomNumber { get; set; }
}