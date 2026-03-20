using MongoDB.Bson;
using MongoDB.Driver;
using WebApplication1.Domain;

namespace WebApplication1.Repositories;

public class OrderRepository
{
    // MongoDB коллекция "orders"
    private readonly IMongoCollection<Order> _orders;

    public OrderRepository(IMongoDatabase db)
    {
        // Подключаемся к коллекции orders
        _orders = db.GetCollection<Order>("orders");
    }

    // Получить заявки конкретного рабочего
    // Можно дополнительно фильтровать по статусу
    public Task<List<Order>> GetByWorkerAsync(string workerId, string? status)
    {
        // Фильтр: workerId
        var filter = Builders<Order>.Filter.Eq(x => x.WorkerId, workerId);

        // Если передан статус — добавляем его к фильтру
        if (!string.IsNullOrWhiteSpace(status))
            filter &= Builders<Order>.Filter.Eq(x => x.Status, status);

        return _orders
            .Find(filter)
            .SortByDescending(x => x.CreatedAt) // новые заявки сверху
            .ToListAsync();
    }

    // Получить ВСЕ заявки (для босса)
    // Можно передать фильтр по статусу
    public Task<List<Order>> GetAllAsync(string? status)
    {
        var filter = Builders<Order>.Filter.Empty;

        if (!string.IsNullOrWhiteSpace(status))
            filter = Builders<Order>.Filter.Eq(x => x.Status, status);

        return _orders
            .Find(filter)
            .SortByDescending(x => x.CreatedAt)
            .ToListAsync();
    }

    // Найти заявку по id
   public async Task<Order?> GetByIdAsync(string id)
{
    return await _orders
        .Find(x => x.Id == id)
        .FirstOrDefaultAsync();
}

    // Создание новой заявки
    public async Task CreateAsync(Order order)
    {
        await _orders.InsertOneAsync(order);
    }

    // Обновление заявки
    // Используется когда:
    // - назначаем специалиста
    // - меняем статус
    // - добавляем отчёт
    public async Task UpdateAsync(Order order)
    {
        await _orders.ReplaceOneAsync(
            x => x.Id == order.Id,
            order
        );
    }
  public Task<List<Order>> GetBySpecialistAsync(string specialistId, string? status)
{
    var filter = Builders<Order>.Filter.Eq(x => x.SpecialistId, specialistId);

    if (!string.IsNullOrWhiteSpace(status))
        filter &= Builders<Order>.Filter.Eq(x => x.Status, status);

    return _orders
        .Find(filter)
        .SortByDescending(x => x.CreatedAt)
        .ToListAsync();
}
}