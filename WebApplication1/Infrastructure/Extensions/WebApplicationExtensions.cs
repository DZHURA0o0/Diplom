namespace WebApplication1.Infrastructure.Extensions;

public static class WebApplicationExtensions
{
    public static WebApplication UseStaticFrontend(this WebApplication app)
    {
        app.UseDefaultFiles();
        app.UseStaticFiles();
        return app;
    }

    public static WebApplication UseAuthPipeline(this WebApplication app)
    {
        app.UseAuthentication();
        app.UseAuthorization();
        return app;
    }
}