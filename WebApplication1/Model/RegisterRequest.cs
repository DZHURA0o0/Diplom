namespace WebApplication1.Models;

public class RegisterRequest
{
    public string FullName { get; set; } = null!;
    public int PassNumber { get; set; }

    public string RoleInSystem { get; set; } = null!;

    public string Login { get; set; } = null!;
    public string Password { get; set; } = null!;

    public string Position { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string Email { get; set; } = null!;

    public long FloorNumber { get; set; }
    public long OfficeNumber { get; set; }
    public long WorkshopNumber { get; set; }
}