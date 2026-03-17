using Microsoft.AspNetCore.SignalR;

namespace SmartWarehouse.API.Hubs;

public class WarehouseHub : Hub
{
    // Frontend bu sınıfa "/warehouseHub" adresi üzerinden WebSocket ile bağlanacak.
    // Şimdilik sadece sunucudan (Backend) istemciye (Frontend) veri iteceğimiz için 
    // buraya ekstra bir metot yazmamıza gerek yok. Altyapı olarak Hub'dan miras alması yeterli.
}