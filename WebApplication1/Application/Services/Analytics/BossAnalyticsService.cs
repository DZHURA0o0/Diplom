using WebApplication1.Domain;
using WebApplication1.Infrastructure.Repositories;
using WebApplication1.Models;
using DomainOrder = WebApplication1.Domain.Order;

namespace WebApplication1.Application.Services.Analytics;

public class BossAnalyticsService
{
    private readonly OrderRepository _orders;
    private readonly UserRepository _users;

    public BossAnalyticsService(
        OrderRepository orders,
        UserRepository users)
    {
        _orders = orders;
        _users = users;
    }

    public async Task<BossAnalyticsDto> GetAnalyticsAsync(
        DateTime? from,
        DateTime? to,
        string? specialistId)
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

        var selectedSpecialistId = string.IsNullOrWhiteSpace(specialistId)
            ? null
            : specialistId.Trim();

        var allOrders = await _orders.GetAllAsync(null);
        var allUsers = await _users.GetAllAsync(null, null);

        var allPeriodOrders = allOrders
            .Where(order => order.CreatedAt >= periodFrom && order.CreatedAt < periodToExclusive)
            .ToList();

        var totalCompletedInPeriod = allPeriodOrders.Count(IsCompleted);

        var periodOrders = allPeriodOrders;

        if (!string.IsNullOrWhiteSpace(selectedSpecialistId))
        {
            periodOrders = periodOrders
                .Where(order => IsSameId(order.SpecialistId, selectedSpecialistId))
                .ToList();
        }

        var usersById = allUsers
            .Where(user => !string.IsNullOrWhiteSpace(user.Id))
            .GroupBy(user => user.Id)
            .ToDictionary(group => group.Key, group => group.First());

        var specialists = allUsers
            .Where(user => IsSameText(user.RoleInSystem, "SPECIALIST"))
            .ToList();

        if (!string.IsNullOrWhiteSpace(selectedSpecialistId))
        {
            specialists = specialists
                .Where(user => IsSameId(user.Id, selectedSpecialistId))
                .ToList();
        }

        var specialistAnalytics = BuildSpecialistAnalytics(
            allPeriodOrders,
            specialists,
            selectedSpecialistId,
            totalCompletedInPeriod
        );

        var shareSummary = BuildSpecialistShareSummary(specialistAnalytics);

        return new BossAnalyticsDto
        {
            PeriodFrom = periodFrom,
            PeriodTo = periodTo,

            TotalOrders = periodOrders.Count,
            CompletedOrders = periodOrders.Count(IsCompleted),
            CanceledOrders = periodOrders.Count(IsCanceled),
            ActiveOrders = periodOrders.Count(IsActive),

            ComplaintsCount = periodOrders.Count(HasComplaint),
            ReworkCount = periodOrders.Count(IsReworkRelated),

            IsPersonalized = !string.IsNullOrWhiteSpace(selectedSpecialistId),
            SelectedSpecialistId = selectedSpecialistId,
            SelectedSpecialistName = specialistAnalytics.FirstOrDefault()?.FullName,

            AverageEfficiencyPercent = shareSummary.AveragePercent,
            LeaderEfficiencyPercent = shareSummary.LeaderPercent,
            LeaderSpecialistName = shareSummary.LeaderName,
            LowestEfficiencyPercent = shareSummary.LowestPercent,
            LowestSpecialistName = shareSummary.LowestName,

            Specialists = specialistAnalytics,

            TopComplainers = BuildTopComplainers(periodOrders, usersById),
            TopRequesters = BuildTopRequesters(periodOrders, usersById),
            TopLocations = BuildTopLocations(periodOrders),

            ServiceTypes = BuildServiceTypeAnalytics(periodOrders),

            BonusRecommendation = BuildBonusRecommendation(specialistAnalytics)
        };
    }

    private static List<SpecialistAnalyticsDto> BuildSpecialistAnalytics(
        List<DomainOrder> allPeriodOrders,
        List<User> specialists,
        string? selectedSpecialistId,
        int totalCompletedInPeriod)
    {
        var result = new List<SpecialistAnalyticsDto>();

        foreach (var specialist in specialists)
        {
            var specialistOrders = allPeriodOrders
                .Where(order => IsSameId(order.SpecialistId, specialist.Id))
                .ToList();

            var assignedCount = specialistOrders.Count;
            var completedCount = specialistOrders.Count(IsCompleted);
            var activeCount = specialistOrders.Count(IsActive);
            var complaintsCount = specialistOrders.Count(HasComplaint);
            var reworkCount = specialistOrders.Count(IsReworkRelated);

            if (assignedCount == 0 && string.IsNullOrWhiteSpace(selectedSpecialistId))
            {
                continue;
            }

            var completionRate = Percent(completedCount, assignedCount);
            var complaintRate = Percent(complaintsCount, completedCount);
            var specialistShare = Percent(completedCount, totalCompletedInPeriod);

            result.Add(new SpecialistAnalyticsDto
            {
                SpecialistId = specialist.Id,
                FullName = GetSafeName(specialist),

                AssignedCount = assignedCount,
                CompletedCount = completedCount,
                ActiveCount = activeCount,

                ComplaintsCount = complaintsCount,
                ReworkCount = reworkCount,

                CompletionRatePercent = completionRate,
                ComplaintRatePercent = complaintRate,

                EfficiencyPercent = specialistShare
            });
        }

        return result
            .OrderByDescending(item => item.EfficiencyPercent)
            .ThenByDescending(item => item.CompletedCount)
            .ToList();
    }

    private static List<ComplainerAnalyticsDto> BuildTopComplainers(
        List<DomainOrder> periodOrders,
        Dictionary<string, User> usersById)
    {
        var totalComplaints = periodOrders.Count(HasComplaint);

        if (totalComplaints == 0)
        {
            return new List<ComplainerAnalyticsDto>();
        }

        var ordersByWorker = periodOrders
            .Where(order => !string.IsNullOrWhiteSpace(order.WorkerId))
            .GroupBy(order => order.WorkerId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var result = new List<ComplainerAnalyticsDto>();

        foreach (var pair in ordersByWorker)
        {
            var workerId = pair.Key;
            var workerOrders = pair.Value;

            var ordersCount = workerOrders.Count;
            var complaintsCount = workerOrders.Count(HasComplaint);

            if (complaintsCount == 0)
            {
                continue;
            }

            result.Add(new ComplainerAnalyticsDto
            {
                WorkerId = workerId,
                FullName = GetUserName(usersById, workerId),

                OrdersCount = ordersCount,
                ComplaintsCount = complaintsCount,

                ComplaintRatePercent = Percent(complaintsCount, ordersCount),
                ComplaintSharePercent = Percent(complaintsCount, totalComplaints)
            });
        }

        return result
            .OrderByDescending(item => item.ComplaintsCount)
            .ThenByDescending(item => item.ComplaintSharePercent)
            .Take(10)
            .ToList();
    }

    private static List<RequesterAnalyticsDto> BuildTopRequesters(
        List<DomainOrder> periodOrders,
        Dictionary<string, User> usersById)
    {
        var totalOrders = periodOrders.Count;

        if (totalOrders == 0)
        {
            return new List<RequesterAnalyticsDto>();
        }

        return periodOrders
            .Where(order => !string.IsNullOrWhiteSpace(order.WorkerId))
            .GroupBy(order => order.WorkerId)
            .Select(group =>
            {
                var workerOrders = group.ToList();
                var ordersCount = workerOrders.Count;

                return new RequesterAnalyticsDto
                {
                    WorkerId = group.Key,
                    FullName = GetUserName(usersById, group.Key),

                    OrdersCount = ordersCount,
                    CompletedCount = workerOrders.Count(IsCompleted),
                    ActiveCount = workerOrders.Count(IsActive),
                    ComplaintsCount = workerOrders.Count(HasComplaint),

                    SharePercent = Percent(ordersCount, totalOrders)
                };
            })
            .OrderByDescending(item => item.SharePercent)
            .ThenByDescending(item => item.OrdersCount)
            .Take(10)
            .ToList();
    }

    private static List<LocationAnalyticsDto> BuildTopLocations(
        List<DomainOrder> periodOrders)
    {
        var totalOrders = periodOrders.Count;

        if (totalOrders == 0)
        {
            return new List<LocationAnalyticsDto>();
        }

        return periodOrders
            .GroupBy(order => new
            {
                order.ProductionWorkshopNumber,
                order.FloorNumber,
                order.RoomNumber
            })
            .Select(group =>
            {
                var ordersCount = group.Count();

                return new LocationAnalyticsDto
                {
                    ProductionWorkshopNumber = group.Key.ProductionWorkshopNumber,
                    FloorNumber = group.Key.FloorNumber,
                    RoomNumber = group.Key.RoomNumber,

                    OrdersCount = ordersCount,

                    SharePercent = Percent(ordersCount, totalOrders)
                };
            })
            .OrderByDescending(item => item.SharePercent)
            .ThenByDescending(item => item.OrdersCount)
            .Take(10)
            .ToList();
    }

    private static BonusRecommendationDto BuildBonusRecommendation(
        List<SpecialistAnalyticsDto> specialistAnalytics)
    {
        var candidates = specialistAnalytics
            .Where(item => item.AssignedCount > 0 && item.CompletedCount > 0)
            .ToList();

        if (candidates.Count == 0)
        {
            return new BonusRecommendationDto
            {
                HasCandidate = false,
                Reason = "Немає спеціалістів з виконаними заявками за обраний період."
            };
        }

        var qualityCandidates = candidates
            .Where(item => item.ComplaintRatePercent <= 30)
            .ToList();

        if (qualityCandidates.Count == 0)
        {
            return new BonusRecommendationDto
            {
                HasCandidate = false,
                Reason = "Немає кандидата на премію: у спеціалістів занадто високий відсоток скарг за обраний період."
            };
        }

        var best = qualityCandidates
            .Select(item => new
            {
                Specialist = item,

                QualityScore = Math.Max(0, 100 - item.ComplaintRatePercent),

                Rating =
                    0.4 * item.EfficiencyPercent +
                    0.4 * item.CompletionRatePercent +
                    0.2 * Math.Max(0, 100 - item.ComplaintRatePercent)
            })
            .OrderByDescending(item => item.Rating)
            .ThenByDescending(item => item.Specialist.CompletedCount)
            .First();

        var specialist = best.Specialist;
        var rating = Math.Round(best.Rating, 1);

        var reason =
            $"Рекомендовано на премію, оскільки спеціаліст має рейтинг {rating}%, " +
            $"виконав {specialist.CompletedCount} заявок, має частку {specialist.EfficiencyPercent}% " +
            $"від усіх виконаних заявок відділу та рівень скарг {specialist.ComplaintRatePercent}%.";

        return new BonusRecommendationDto
        {
            HasCandidate = true,

            SpecialistId = specialist.SpecialistId,
            FullName = specialist.FullName,

            RatingPercent = rating,

            CompletedCount = specialist.CompletedCount,
            AssignedCount = specialist.AssignedCount,
            ComplaintsCount = specialist.ComplaintsCount,

            SharePercent = specialist.EfficiencyPercent,
            CompletionRatePercent = specialist.CompletionRatePercent,
            ComplaintRatePercent = specialist.ComplaintRatePercent,

            Reason = reason
        };
    }

    private static List<ServiceTypeAnalyticsDto> BuildServiceTypeAnalytics(
        List<DomainOrder> periodOrders)
    {
        var totalOrders = periodOrders.Count;

        return periodOrders
            .Where(order => !string.IsNullOrWhiteSpace(order.ServiceType))
            .GroupBy(order => Normalize(order.ServiceType))
            .Select(group =>
            {
                var orders = group.ToList();
                var ordersCount = orders.Count;

                return new ServiceTypeAnalyticsDto
                {
                    ServiceType = group.Key,
                    Count = ordersCount,
                    SharePercent = Percent(ordersCount, totalOrders),
                    CompletedCount = orders.Count(IsCompleted),
                    ComplaintsCount = orders.Count(HasComplaint)
                };
            })
            .OrderByDescending(item => item.Count)
            .ToList();
    }

    private static (
        double AveragePercent,
        double LeaderPercent,
        string? LeaderName,
        double LowestPercent,
        string? LowestName
    ) BuildSpecialistShareSummary(List<SpecialistAnalyticsDto> specialistAnalytics)
    {
        var rows = specialistAnalytics
            .Where(item => item.AssignedCount > 0)
            .ToList();

        if (rows.Count == 0)
        {
            return (0, 0, null, 0, null);
        }

        var leader = rows
            .OrderByDescending(item => item.EfficiencyPercent)
            .ThenByDescending(item => item.CompletedCount)
            .First();

        var lowest = rows
            .OrderBy(item => item.EfficiencyPercent)
            .ThenBy(item => item.CompletedCount)
            .First();

        return (
            Math.Round(rows.Average(item => item.EfficiencyPercent), 1),
            leader.EfficiencyPercent,
            leader.FullName,
            lowest.EfficiencyPercent,
            lowest.FullName
        );
    }

    private static double Percent(int value, int total)
    {
        if (total <= 0)
        {
            return 0;
        }

        return Math.Round((double)value / total * 100, 1);
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
        return order.Complaint != null && order.Complaint.IsSubmitted;
    }

    private static bool IsReworkRelated(DomainOrder order)
    {
        if (IsStatus(order, "REWORK") || IsStatus(order, "REWORK_REVIEW"))
        {
            return true;
        }

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
        {
            return GetSafeName(user);
        }

        return "Невідомий користувач";
    }

    private static string GetSafeName(User user)
    {
        if (!string.IsNullOrWhiteSpace(user.FullName))
        {
            return user.FullName;
        }

        if (!string.IsNullOrWhiteSpace(user.Login))
        {
            return user.Login;
        }

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
}
