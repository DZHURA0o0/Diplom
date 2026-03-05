using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using WebApplication1.Repositories;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly OrderRepository _repo;

    public OrdersController(OrderRepository repo)
    {
        _repo = repo;
    }

    [Authorize(Roles = "WORKER")]
    [HttpGet("my")]
    public async Task<IActionResult> My([FromQuery] string? status)
    {
        var workerId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);

        if (workerId == null)
            return Unauthorized();

        var orders = await _repo.GetByWorkerAsync(workerId, status);

        return Ok(orders);
    }
}