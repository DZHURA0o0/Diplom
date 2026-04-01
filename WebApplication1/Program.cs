using WebApplication1.Infrastructure.Extensions;
using WebApplication1.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// CORS
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("dev", p => p
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// Infrastructure
builder.Services.AddMongo(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);

// Repositories
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<DetailRequestRepository>();
builder.Services.AddScoped<WorkReportRepository>();

// Services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();

builder.Services.AddScoped<OrderQueryService>();
builder.Services.AddScoped<OrderCommandService>();
builder.Services.AddScoped<SpecialistOrderWorkflowService>();
builder.Services.AddScoped<SpecialistWorkReportService>();
builder.Services.AddScoped<OrderService>();

builder.Services.AddScoped<BossOrderDetailsService>();

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