namespace WebApplication1.Models;

public class UpdateUserRoleRequest
{
    public string Role { get; set; } = "";
}

public class UpdateUserStatusRequest
{
    public string AccountStatus { get; set; } = "";
}

public class UpdateUserDetailsRequest
{
    public string FullName { get; set; } = "";
    public string Login { get; set; } = "";
    public int PassNumber { get; set; }
    public string Role { get; set; } = "";
    public string Position { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string AccountStatus { get; set; } = "";
    public long FloorNumber { get; set; }
    public long OfficeNumber { get; set; }
    public long WorkshopNumber { get; set; }
}

public class UpdateUserPasswordRequest
{
    public string NewPassword { get; set; } = "";
}
