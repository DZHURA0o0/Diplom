using WebApplication1.Infrastructure.Extensions;
using WebApplication1.Repositories;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("dev", p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Mongo + JWT
builder.Services.AddMongo(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);

// сервисы
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<AuthService>();

var app = builder.Build();

app.UseCors("dev");

app.UseStaticFrontend();
app.UseAuthPipeline();

app.MapControllers();

app.Run();