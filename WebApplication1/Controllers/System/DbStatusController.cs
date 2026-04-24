using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

namespace WebApplication1.Controllers;

[ApiController]
[Route("api/db")]
public class DbStatusController : ControllerBase
{
    private readonly IMongoDatabase _db;

    public DbStatusController(IMongoDatabase db)
    {
        _db = db;
    }

    [HttpGet("enable")]
    public async Task<ActionResult> DbEnable()
    {
        try
        {
            await _db.RunCommandAsync<BsonDocument>(new BsonDocument("ping", 1));
            return Ok(new { db = "online" });
        }
        catch
        {
            return StatusCode(503, new { db = "offline" });
        }
    }
}