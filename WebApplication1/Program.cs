using WebApplication1.Application.Hubs;
using WebApplication1.Application.Services.Auth;
using WebApplication1.Application.Services.Boss;
using WebApplication1.Application.Services.Complaints;
using WebApplication1.Application.Services.Order;
using WebApplication1.Application.Services.Reports;
using WebApplication1.Application.Services.Users;
using WebApplication1.Application.Services.Analytics;
using WebApplication1.Application.Services.Realtime;
using WebApplication1.Infrastructure.Extensions;
using WebApplication1.Infrastructure.Repositories;
using WebApplication1.Application.Services.Details;

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

// SignalR
builder.Services.AddSignalR();

// Repositories
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<DetailRequestRepository>();
builder.Services.AddScoped<WorkReportRepository>();

// Application services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();

builder.Services.AddScoped<OrderService>();

builder.Services.AddScoped<ComplaintService>();
builder.Services.AddScoped<BossOrderDetailsService>();

// Analytics
builder.Services.AddScoped<BossAnalyticsService>();
builder.Services.AddScoped<SpecialistAnalyticsService>();

// Details status sync via MongoDB Change Stream
builder.Services.AddScoped<DetailRequestStatusSyncService>();
builder.Services.AddHostedService<DetailRequestChangeStreamService>();

// Work reports / rework reports
builder.Services.AddScoped<SpecialistWorkReportService>();

// Realtime notifications
builder.Services.AddSingleton<RealtimeNotificationService>();

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

// SignalR hub
app.MapHub<RealtimeNotificationHub>("/hubs/realtime");
app.MapHub<RealtimeNotificationHub>("/hubs/specialist");

app.Run();
