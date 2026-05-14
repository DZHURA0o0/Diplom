using WebApplication1.Domain;
using WebApplication1.Infrastructure.Repositories;
using WebApplication1.Models;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Analytics;

public class SpecialistAnalyticsService
{
    private readonly OrderRepository _orders;
    private readonly UserRepository _users;

    public SpecialistAnalyticsService(
        OrderRepository orders,
        UserRepository users)
    {
        _orders = orders;
        _users = users;
    }

    public async Task<SpecialistPanelAnalyticsDto> GetAnalyticsAsync(
        DateTime? from,
        DateTime? to,
        string specialistId)
    {
        var today = DateTime.UtcNow.Date;

        var periodFrom = from?.Date
            ?? new DateTime(today.Year, today.Month, 1);

        var periodTo = to?.Date
            ?? today;

        if (periodFrom > periodTo)
        {
            (periodFrom, periodTo) = (periodTo, periodFrom);
        }

        var periodToExclusive = periodTo.AddDays(1);

        var allOrders = await _orders.GetAllAsync(null);
        var allUsers = await _users.GetAllAsync(null, null);
        var allSpecialists = await _users.GetAllAsync("SPECIALIST", null);

        var usersById = allUsers
            .Where(user => !string.IsNullOrWhiteSpace(user.Id))
            .GroupBy(user => user.Id)
            .ToDictionary(group => group.Key, group => group.First());

        var departmentOrders = allOrders
            .Where(order => order.CreatedAt >= periodFrom && order.CreatedAt < periodToExclusive)
            .ToList();

        var personalOrders = departmentOrders
            .Where(order => IsSameId(order.SpecialistId, specialistId))
            .ToList();

        var personalSummary = BuildSummary(personalOrders);
        var departmentSummary = BuildSummary(departmentOrders);

        var activeSpecialistsCount = allSpecialists
            .Count(user => IsSameText(user.AccountStatus, "ACTIVE"));

        var specialistsWithOrdersCount = departmentOrders
            .Where(order => !string.IsNullOrWhiteSpace(order.SpecialistId))
            .Select(order => Normalize(order.SpecialistId))
            .Distinct()
            .Count();

        var averageOrdersPerSpecialist = Average(
            departmentSummary.TotalOrders,
            Math.Max(specialistsWithOrdersCount, 1)
        );

        var averageCompletedPerSpecialist = Average(
            departmentSummary.CompletedOrders,
            Math.Max(specialistsWithOrdersCount, 1)
        );

        var personalOrdersSharePercent = Percent(
            personalSummary.TotalOrders,
            departmentSummary.TotalOrders
        );

        var personalCompletedSharePercent = Percent(
            personalSummary.CompletedOrders,
            departmentSummary.CompletedOrders
        );

        var adjustedCompletionRate = AdjustedRatePercent(
            personalSummary.CompletedOrders,
            personalSummary.TotalOrders,
            departmentSummary.CompletedOrders,
            departmentSummary.TotalOrders,
            averageOrdersPerSpecialist
        );

        var adjustedComplaintRate = AdjustedRatePercent(
            personalSummary.ComplaintsCount,
            personalSummary.TotalOrders,
            departmentSummary.ComplaintsCount,
            departmentSummary.TotalOrders,
            averageOrdersPerSpecialist
        );

        var rating = Round(
            0.4 * personalCompletedSharePercent +
            0.4 * adjustedCompletionRate +
            0.2 * Math.Max(0, 100 - adjustedComplaintRate)
        );

        return new SpecialistPanelAnalyticsDto
        {
            PeriodFrom = periodFrom,
            PeriodTo = periodTo,

            Personal = personalSummary,
            Department = departmentSummary,

            Comparison = new SpecialistAnalyticsComparisonDto
            {
                PersonalCompletedSharePercent = personalCompletedSharePercent,

                PersonalOrdersSharePercent = personalOrdersSharePercent,

                RatingPercent = rating,
                WorkloadPercent = personalOrdersSharePercent,
                CompletionRatePercent = personalSummary.CompletionRatePercent,
                ComplaintRatePercent = personalSummary.ComplaintRatePercent,
                AdjustedCompletionRatePercent = adjustedCompletionRate,
                AdjustedComplaintRatePercent = adjustedComplaintRate,

                CompletionRateDifferencePercent = Round(
                    adjustedCompletionRate - departmentSummary.CompletionRatePercent
                ),

                ComplaintRateDifferencePercent = Round(
                    adjustedComplaintRate - departmentSummary.ComplaintRatePercent
                ),

                DepartmentSpecialistsCount = activeSpecialistsCount,
                DepartmentSpecialistsWithOrdersCount = specialistsWithOrdersCount,

                AverageOrdersPerSpecialist = averageOrdersPerSpecialist,

                AverageCompletedPerSpecialist = averageCompletedPerSpecialist
            },

            PersonalStatuses = BuildStatusAnalytics(personalOrders),
            DepartmentStatuses = BuildStatusAnalytics(departmentOrders),

            PersonalTopRequester = BuildTopRequester(personalOrders, usersById),
            PersonalTopComplainer = BuildTopComplainer(personalOrders, usersById),

            DepartmentTopRequester = BuildTopRequester(departmentOrders, usersById),
            DepartmentTopComplainer = BuildTopComplainer(departmentOrders, usersById)
        };
    }

    private static SpecialistAnalyticsSummaryDto BuildSummary(List<DomainOrder> orders)
    {
        var total = orders.Count;
        var completed = orders.Count(IsCompleted);
        var active = orders.Count(IsActive);
        var canceled = orders.Count(IsCanceled);
        var complaints = orders.Count(HasComplaint);
        var rework = orders.Count(IsReworkRelated);

        return new SpecialistAnalyticsSummaryDto
        {
            TotalOrders = total,
            CompletedOrders = completed,
            ActiveOrders = active,
            CanceledOrders = canceled,
            ComplaintsCount = complaints,
            ReworkCount = rework,

            CompletionRatePercent = Percent(completed, total),
            ComplaintRatePercent = Percent(complaints, completed),
            ReworkRatePercent = Percent(rework, total)
        };
    }

    private static List<SpecialistStatusAnalyticsDto> BuildStatusAnalytics(List<DomainOrder> orders)
    {
        var total = orders.Count;

        if (total == 0)
            return new List<SpecialistStatusAnalyticsDto>();

        return orders
            .Where(order => !string.IsNullOrWhiteSpace(order.Status))
            .GroupBy(order => Normalize(order.Status))
            .Select(group => new SpecialistStatusAnalyticsDto
            {
                Status = group.Key,
                Count = group.Count(),
                SharePercent = Percent(group.Count(), total)
            })
            .OrderByDescending(item => item.Count)
            .ThenBy(item => item.Status)
            .ToList();
    }

    private static SpecialistWorkerActivityDto? BuildTopRequester(
        List<DomainOrder> orders,
        Dictionary<string, User> usersById)
    {
        var totalOrders = orders.Count;

        if (totalOrders == 0)
            return null;

        return orders
            .Where(order => !string.IsNullOrWhiteSpace(order.WorkerId))
            .GroupBy(order => order.WorkerId)
            .Select(group =>
            {
                var workerOrders = group.ToList();
                var complaintsCount = workerOrders.Count(HasComplaint);
                var completedCount = workerOrders.Count(IsCompleted);

                return new SpecialistWorkerActivityDto
                {
                    WorkerId = group.Key,
                    FullName = GetUserName(usersById, group.Key),

                    OrdersCount = workerOrders.Count,
                    CompletedCount = completedCount,
                    ActiveCount = workerOrders.Count(IsActive),
                    ComplaintsCount = complaintsCount,

                    OrdersSharePercent = Percent(workerOrders.Count, totalOrders),
                    ComplaintRatePercent = Percent(complaintsCount, completedCount),
                    ComplaintSharePercent = Percent(complaintsCount, orders.Count(HasComplaint))
                };
            })
            .OrderByDescending(item => item.OrdersCount)
            .ThenByDescending(item => item.OrdersSharePercent)
            .FirstOrDefault();
    }

    private static SpecialistWorkerActivityDto? BuildTopComplainer(
        List<DomainOrder> orders,
        Dictionary<string, User> usersById)
    {
        var totalComplaints = orders.Count(HasComplaint);

        if (totalComplaints == 0)
            return null;

        return orders
            .Where(order => !string.IsNullOrWhiteSpace(order.WorkerId))
            .GroupBy(order => order.WorkerId)
            .Select(group =>
            {
                var workerOrders = group.ToList();
                var complaintsCount = workerOrders.Count(HasComplaint);
                var completedCount = workerOrders.Count(IsCompleted);

                return new SpecialistWorkerActivityDto
                {
                    WorkerId = group.Key,
                    FullName = GetUserName(usersById, group.Key),

                    OrdersCount = workerOrders.Count,
                    CompletedCount = completedCount,
                    ActiveCount = workerOrders.Count(IsActive),
                    ComplaintsCount = complaintsCount,

                    OrdersSharePercent = Percent(workerOrders.Count, orders.Count),
                    ComplaintRatePercent = Percent(complaintsCount, completedCount),
                    ComplaintSharePercent = Percent(complaintsCount, totalComplaints)
                };
            })
            .Where(item => item.ComplaintsCount > 0)
            .OrderByDescending(item => item.ComplaintsCount)
            .ThenByDescending(item => item.ComplaintSharePercent)
            .FirstOrDefault();
    }

    private static bool IsCompleted(DomainOrder order)
    {
        return IsStatus(order, "DONE");
    }

    private static bool IsCanceled(DomainOrder order)
    {
        return IsStatus(order, "CANCELED");
    }

    private static bool IsActive(DomainOrder order)
    {
        return !IsCompleted(order) && !IsCanceled(order);
    }

    private static bool HasComplaint(DomainOrder order)
    {
        return order.Complaint != null &&
               order.Complaint.IsSubmitted &&
               !IsRejectedComplaint(order);
    }

    private static bool IsRejectedComplaint(DomainOrder order)
    {
        return order.Complaint != null &&
               order.Complaint.ClosedAt != null &&
               string.IsNullOrWhiteSpace(order.Complaint.ResolvedByReportId);
    }

    private static bool IsReworkRelated(DomainOrder order)
    {
        if (IsStatus(order, "REWORK") || IsStatus(order, "REWORK_REVIEW"))
            return true;

        return order.Complaint != null &&
               !string.IsNullOrWhiteSpace(order.Complaint.ResolvedByReportId);
    }

    private static bool IsStatus(DomainOrder order, string status)
    {
        return IsSameText(order.Status, status);
    }

    private static string GetUserName(Dictionary<string, User> usersById, string userId)
    {
        if (usersById.TryGetValue(userId, out var user))
            return GetSafeName(user);

        return "Невідомий користувач";
    }

    private static string GetSafeName(User user)
    {
        if (!string.IsNullOrWhiteSpace(user.FullName))
            return user.FullName;

        if (!string.IsNullOrWhiteSpace(user.Login))
            return user.Login;

        return "Невідомий користувач";
    }

    private static bool IsSameId(string? left, string? right)
    {
        return string.Equals(
            left?.Trim(),
            right?.Trim(),
            StringComparison.OrdinalIgnoreCase
        );
    }

    private static bool IsSameText(string? left, string? right)
    {
        return string.Equals(
            Normalize(left),
            Normalize(right),
            StringComparison.OrdinalIgnoreCase
        );
    }

    private static string Normalize(string? value)
    {
        return (value ?? "").Trim().ToUpperInvariant();
    }

    private static double Percent(int value, int total)
    {
        if (total <= 0)
            return 0;

        return Round((double)value / total * 100);
    }

    private static double Average(int value, int total)
    {
        if (total <= 0)
            return 0;

        return Round((double)value / total);
    }

    private static double AdjustedRatePercent(
        int personalValue,
        int personalTotal,
        int departmentValue,
        int departmentTotal,
        double averageOrdersPerSpecialist)
    {
        if (personalTotal <= 0 && departmentTotal <= 0)
            return 0;

        var priorRate = departmentTotal <= 0
            ? 0
            : (double)departmentValue / departmentTotal;

        var priorWeight = Math.Max(1, averageOrdersPerSpecialist);

        return Round((personalValue + priorRate * priorWeight) / (personalTotal + priorWeight) * 100);
    }

    private static double Round(double value)
    {
        return Math.Round(value, 1);
    }
}
