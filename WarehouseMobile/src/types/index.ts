export interface User {
    email: string;
    fullName: string;
    role: string;
    companyId: string;
}

export interface LoginResponse {
    Token: string;
    Email: string;
    FullName: string;
    Role: string;
    CompanyId: string;
    ExpiresAt: string;
}

export interface Product {
    Id: number;
    Name: string;
    Barcode: string;
    Description: string;
    CompanyId: string;
}

export interface WarehouseZone {
    Id: number;
    Name: string;
    Description: string;
    Capacity: number;
    CompanyId: string;
}