
export interface Product { /* mevcut tanımlarınız varsa koruyun */ Id: number; Name: string; Barcode: string; Description: string; CompanyId: string; }
export interface Zone { Id: number; Name: string; }
// ... diğer mevcut tipler ...

// 🆕 Üretim Emri Modülü Tipleri
export interface WorkOrder {
    Id: number;
    WorkOrderNumber: string;
    OrderDate: string;
    Status: string;
    ProductName: string;
    PlannedQuantity: number;
    ActualQuantity: number;
    Materials: WorkOrderMaterial[];
}

export interface WorkOrderMaterial {
    MaterialId: number;
    MaterialName: string;
    RequiredQuantity: number;
    IssuedQuantity: number;
    AvailableStock: number;
}

export interface CreateWorkOrderRequest {
    ProductId: number;
    PlannedQuantity: number;
    PlannedStartDate?: string;
    PlannedEndDate?: string;
    Notes?: string;
}

export interface CompleteWorkOrderRequest {
    ActualQuantity: number;
    WastedQuantities?: Record<number, number>;
}