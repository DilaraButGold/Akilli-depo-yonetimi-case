import axiosInstance from '../utils/axiosConfig';
import type { CreateWorkOrderRequest, CompleteWorkOrderRequest } from '../types';

const BASE = '/workorders';

export const getWorkOrders = async (page: number, pageSize: number, status?: string) => {
    const params: any = { page, pageSize };
    if (status) params.status = status;
    const res = await axiosInstance.get(`${BASE}/get-all`, { params });
    return res.data;
};

export const getWorkOrderById = async (id: number) => {
    const res = await axiosInstance.get(`${BASE}/get-by-id/${id}`);
    return res.data;
};

export const createWorkOrder = async (data: CreateWorkOrderRequest) => {
    const res = await axiosInstance.post(`${BASE}/create`, data);
    return res.data;
};

export const startWorkOrder = async (id: number) => {
    const res = await axiosInstance.post(`${BASE}/start/${id}`);
    return res.data;
};

export const completeWorkOrder = async (id: number, data: CompleteWorkOrderRequest) => {
    const res = await axiosInstance.post(`${BASE}/complete/${id}`, data);
    return res.data;
};

export const cancelWorkOrder = async (id: number) => {
    const res = await axiosInstance.post(`${BASE}/cancel/${id}`);
    return res.data;
};