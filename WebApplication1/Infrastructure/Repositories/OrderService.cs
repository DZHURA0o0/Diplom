using MongoDB.Bson;
using WebApplication1.Domain;
using WebApplication1.Models;

namespace WebApplication1.Repositories;

public class OrderService
{
    // Репозиторий - слой, который напрямую работает с базой данных
    private readonly OrderRepository _repo;

    public OrderService(OrderRepository repo)
    {
        _repo = repo;
    }

    // Получить заявки конкретного рабочего.
    // status можно передать как фильтр, например "NEW" или "ASSIGNED".
    public async Task<List<Order>> GetByWorkerAsync(string workerId, string? status)
    {
        return await _repo.GetByWorkerAsync(workerId, status);
    }

    // Получить все заявки для босса / начальника отделения.
    // Если status == null, вернутся все заявки.
    // Если status передан, вернутся только заявки с этим статусом.
    public async Task<List<Order>> GetAllAsync(string? status)
    {
        return await _repo.GetAllAsync(status);
    }

    // Создание новой заявки от имени рабочего.
    // Метод:
    // 1) валидирует входные данные
    // 2) собирает новый объект Order
    // 3) сохраняет его в БД
    // 4) возвращает результат
    public async Task<(bool ok, string? message, Order? order)> CreateAsync(
        string workerId,
        CreateOrderRequest req)
    {
        // Проверка: workerId обязан быть
        if (string.IsNullOrWhiteSpace(workerId))
            return (false, "Unauthorized", null);

        // Проверка: тип услуги обязателен
        if (string.IsNullOrWhiteSpace(req.ServiceType))
            return (false, "ServiceType required", null);

        // Проверка: описание проблемы обязательно
        if (string.IsNullOrWhiteSpace(req.DescriptionProblem))
            return (false, "DescriptionProblem required", null);

        // Проверка: описание не должно быть слишком коротким
        if (req.DescriptionProblem.Trim().Length < 5)
            return (false, "Description too short", null);

        // Создаём новый объект заявки
        var order = new Order
        {
            // Кто создал заявку
            WorkerId = workerId,

            // Пока специалист не назначен
            SpecialistId = null,

            // Пока запрос на детали не создан
            DetailRequestId = null,

            // Пока отчётов по работе нет
            WorkReportIds = new List<ObjectId>(),

            // Нормализуем тип услуги: убираем пробелы и делаем верхний регистр
            ServiceType = req.ServiceType.Trim().ToUpperInvariant(),

            // Нормализуем описание
            DescriptionProblem = req.DescriptionProblem.Trim(),

            // Результат осмотра пока отсутствует
            InspectionResult = null,

            // Локация проблемы
            ProductionWorkshopNumber = req.WorkshopNumber,
            FloorNumber = req.FloorNumber,
            RoomNumber = req.RoomNumber,

            // Начальный статус новой заявки
            Status = "NEW",

            // Время создания лучше хранить в UTC
            CreatedAt = DateTime.UtcNow,

            // Инициализируем блок complaint сразу,
            // чтобы потом код не падал на null и структура была одинаковой у всех заявок
            Complaint = new BsonDocument
            {
                { "is_submitted", false },
                { "complaint_id", BsonNull.Value }
            }
        };

        // Сохраняем заявку в БД
        await _repo.CreateAsync(order);

        // Возвращаем успех и саму созданную заявку
        return (true, "Order created", order);
    }

    // Назначение специалиста на заявку.
    // Это уже логика для босса / начальника отделения.
    // Метод:
    // 1) проверяет входные данные
    // 2) ищет заявку по id
    // 3) записывает specialistId
    // 4) при необходимости переводит статус в ASSIGNED
    // 5) сохраняет изменения
   public async Task<(bool ok, string? message, Order? order)> AssignSpecialistAsync(
    string orderId,
    AssignSpecialistRequest req)
{
    if (string.IsNullOrWhiteSpace(orderId))
        return (false, "OrderId required", null);

    if (req == null)
        return (false, "Request body required", null);

    var order = await _repo.GetByIdAsync(orderId);

    if (order == null)
        return (false, "Order not found", null);

    // Если пришла пустая строка или null - снимаем специалиста
    if (string.IsNullOrWhiteSpace(req.SpecialistId))
    {
        order.SpecialistId = null;
        order.Status = "NEW";

        await _repo.UpdateAsync(order);

        return (true, "Specialist removed", order);
    }

    // Иначе назначаем / переназначаем специалиста
    order.SpecialistId = req.SpecialistId.Trim();
    order.Status = "ASSIGNED";

    await _repo.UpdateAsync(order);

    return (true, "Specialist assigned", order);
}
}