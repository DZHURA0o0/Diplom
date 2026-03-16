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

builder.Services.AddMongo(builder.Configuration);
builder.Services.AddJwtAuth(builder.Configuration);
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<OrderService>();

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