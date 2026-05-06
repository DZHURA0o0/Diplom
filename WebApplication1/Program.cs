using WebApplication1.Application.Services.Auth;
using WebApplication1.Application.Services.Boss;
using WebApplication1.Application.Services.Complaints;
using WebApplication1.Application.Services.Order;
using WebApplication1.Application.Services.Users;
using WebApplication1.Infrastructure.Extensions;
using WebApplication1.Repositories;
using WebApplication1.Application.Services.Notifications;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("dev", p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddMongo(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);

// Repositories
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<DetailRequestRepository>();
builder.Services.AddScoped<WorkReportRepository>();

// Application services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();

builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<OrderQueryService>();
builder.Services.AddScoped<OrderCommandService>();
builder.Services.AddScoped<OrderWorkflowService>();

builder.Services.AddScoped<ComplaintService>();
builder.Services.AddScoped<BossOrderDetailsService>();

// Email notifications
builder.Services.AddSingleton<EmailNotificationService>();

// MongoDB watcher
builder.Services.AddHostedService<OrderStatusWatcherService>();

// Test email on application startup
builder.Services.AddHostedService<StartupEmailTestService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseCors("dev");

app.UseStaticFrontend();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();