import { useState, useEffect, useCallback } from 'react';
import {
    Container, Paper, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TablePagination,
    Button, Chip, Stack, CircularProgress, Alert, Dialog,
    DialogTitle, DialogContent, DialogActions, Box,
    TextField, FormControl, InputLabel, Select, MenuItem,
    Snackbar
} from '@mui/material';
import {
    Add as AddIcon,
    PlayArrow as PlayArrowIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { getWorkOrders, getWorkOrderById, startWorkOrder, completeWorkOrder, cancelWorkOrder } from '../services/WorkOrderService';
import type { WorkOrder, CreateWorkOrderRequest } from '../types';
import axiosInstance from '../utils/axiosConfig';

const statusColors: Record<string, 'default' | 'primary' | 'warning' | 'success' | 'error'> = {
    Taslak: 'default',
    Onaylandi: 'primary',
    Uretimde: 'warning',
    Tamamlandi: 'success',
    Iptal: 'error',
};

interface ProductOption {
    Id: number;
    Name: string;
}

export default function WorkOrdersPage() {
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [statusFilter, setStatusFilter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Detay modalı
    const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
    const [openDetail, setOpenDetail] = useState(false);

    // Yeni emir formu modalı
    const [openCreate, setOpenCreate] = useState(false);
    const [products, setProducts] = useState<ProductOption[]>([]);
    const [newOrder, setNewOrder] = useState<CreateWorkOrderRequest>({
        ProductId: 0,
        PlannedQuantity: 0,
        PlannedStartDate: '',
        PlannedEndDate: '',
        Notes: ''
    });
    const [creating, setCreating] = useState(false);

    // Snackbar
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

    // Ürünleri yükle
    const fetchProducts = async () => {
        try {
            const res = await axiosInstance.get('/products/get-all', { params: { page: 1, pageSize: 100 } });
            if (res.data.Success) {
                setProducts(res.data.Data);
            }
        } catch (err) {
            console.error('Ürünler alınamadı', err);
        }
    };

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getWorkOrders(page + 1, pageSize, statusFilter || undefined);
            if (res.Success) {
                setWorkOrders(res.Data);
                setTotalCount(res.TotalCount);
            } else {
                setError(res.Message || 'Veri alınamadı.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.Message || err.message || 'Bağlantı hatası.');
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, statusFilter]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpenCreate = () => {
        setNewOrder({
            ProductId: 0,
            PlannedQuantity: 0,
            PlannedStartDate: new Date().toISOString().slice(0, 10),
            PlannedEndDate: '',
            Notes: ''
        });
        setOpenCreate(true);
    };

    const handleCreateOrder = async () => {
        if (!newOrder.ProductId || !newOrder.PlannedQuantity || newOrder.PlannedQuantity <= 0) {
            setSnackbar({ open: true, message: 'Lütfen ürün ve miktar seçin.', severity: 'error' });
            return;
        }

        setCreating(true);
        try {
            const payload: CreateWorkOrderRequest = {
                ...newOrder,
                PlannedStartDate: newOrder.PlannedStartDate ? new Date(newOrder.PlannedStartDate).toISOString() : undefined,
                PlannedEndDate: newOrder.PlannedEndDate ? new Date(newOrder.PlannedEndDate).toISOString() : undefined,
            };

            const res = await axiosInstance.post('/workorders/create', payload);
            if (res.data.Success) {
                setSnackbar({ open: true, message: 'Üretim emri başarıyla oluşturuldu!', severity: 'success' });
                setOpenCreate(false);
                fetchOrders();
            } else {
                setSnackbar({ open: true, message: res.data.Message || 'Oluşturma başarısız.', severity: 'error' });
            }
        } catch (err: any) {
            const msg = err?.response?.data?.Message || 'Bir hata oluştu.';
            setSnackbar({ open: true, message: msg, severity: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleDetail = async (id: number) => {
        try {
            const res = await getWorkOrderById(id);
            if (res.Success) {
                setSelectedOrder(res.Data);
                setOpenDetail(true);
            }
        } catch (err) {
            console.error('Detay alınamadı', err);
        }
    };

    const handleStart = async (id: number) => {
        try {
            await startWorkOrder(id);
            setSnackbar({ open: true, message: 'Üretim başlatıldı!', severity: 'success' });
            fetchOrders();
        } catch (err: any) {
            const message = err?.response?.data?.Message || 'Başlatma sırasında bir hata oluştu.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    const handleComplete = async (id: number) => {
        try {
            await completeWorkOrder(id, { ActualQuantity: 0, WastedQuantities: {} });
            setSnackbar({ open: true, message: 'Üretim tamamlandı!', severity: 'success' });
            fetchOrders();
        } catch (err: any) {
            const message = err?.response?.data?.Message || 'Tamamlama sırasında bir hata oluştu.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    const handleCancel = async (id: number) => {
        if (!window.confirm('Emri iptal etmek istediğinize emin misiniz?')) return;
        try {
            await cancelWorkOrder(id);
            setSnackbar({ open: true, message: 'Üretim emri iptal edildi.', severity: 'success' });
            fetchOrders();
        } catch (err: any) {
            const message = err?.response?.data?.Message || 'İptal sırasında bir hata oluştu.';
            setSnackbar({ open: true, message, severity: 'error' });
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Üretim Emirleri
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                    Yeni Emir
                </Button>
                <Stack direction="row" spacing={1} alignItems="center">
                    {['', 'Taslak', 'Onaylandi', 'Uretimde', 'Tamamlandi', 'Iptal'].map((s) => (
                        <Button
                            key={s}
                            variant={statusFilter === s ? 'contained' : 'outlined'}
                            size="small"
                            onClick={() => { setPage(0); setStatusFilter(s); }}
                        >
                            {s || 'Tümü'}
                        </Button>
                    ))}
                </Stack>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Emir No</TableCell>
                                <TableCell>Ürün</TableCell>
                                <TableCell>Planlanan Miktar</TableCell>
                                <TableCell>Durum</TableCell>
                                <TableCell>Tarih</TableCell>
                                <TableCell align="right">İşlemler</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center"><CircularProgress /></TableCell>
                                </TableRow>
                            ) : workOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">Kayıt bulunamadı.</TableCell>
                                </TableRow>
                            ) : (
                                workOrders.map((wo) => (
                                    <TableRow key={wo.Id} hover>
                                        <TableCell>{wo.WorkOrderNumber}</TableCell>
                                        <TableCell>{wo.ProductName}</TableCell>
                                        <TableCell>{wo.PlannedQuantity}</TableCell>
                                        <TableCell>
                                            <Chip label={wo.Status} color={statusColors[wo.Status] || 'default'} size="small" />
                                        </TableCell>
                                        <TableCell>{new Date(wo.OrderDate).toLocaleDateString('tr-TR')}</TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                <Button size="small" variant="outlined" onClick={() => handleDetail(wo.Id)}>
                                                    Detay
                                                </Button>
                                                {wo.Status === 'Taslak' && (
                                                    <Button size="small" color="warning" variant="contained" onClick={() => handleStart(wo.Id)}>
                                                        <PlayArrowIcon /> Başlat
                                                    </Button>
                                                )}
                                                {wo.Status === 'Uretimde' && (
                                                    <Button size="small" color="success" variant="contained" onClick={() => handleComplete(wo.Id)}>
                                                        <CheckCircleIcon /> Tamamla
                                                    </Button>
                                                )}
                                                {(wo.Status === 'Taslak' || wo.Status === 'Onaylandi') && (
                                                    <Button size="small" color="error" variant="outlined" onClick={() => handleCancel(wo.Id)}>
                                                        <CancelIcon /> İptal
                                                    </Button>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={totalCount}
                    page={page}
                    onPageChange={(_, p) => setPage(p)}
                    rowsPerPage={pageSize}
                    onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                    labelRowsPerPage="Sayfa başına:"
                />
            </Paper>

            {/* Yeni Emir Oluşturma Modalı */}
            <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Yeni Üretim Emri Oluştur</DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>Ürün</InputLabel>
                            <Select
                                value={newOrder.ProductId || ''}
                                label="Ürün"
                                onChange={(e) => setNewOrder({ ...newOrder, ProductId: Number(e.target.value) })}
                            >
                                {products.map((p) => (
                                    <MenuItem key={p.Id} value={p.Id}>{p.Name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Planlanan Miktar"
                            type="number"
                            fullWidth
                            value={newOrder.PlannedQuantity || ''}
                            onChange={(e) => setNewOrder({ ...newOrder, PlannedQuantity: Number(e.target.value) })}
                        />
                        <TextField
                            label="Planlanan Başlangıç"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={newOrder.PlannedStartDate || ''}
                            onChange={(e) => setNewOrder({ ...newOrder, PlannedStartDate: e.target.value })}
                        />
                        <TextField
                            label="Planlanan Bitiş"
                            type="date"
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                            value={newOrder.PlannedEndDate || ''}
                            onChange={(e) => setNewOrder({ ...newOrder, PlannedEndDate: e.target.value })}
                        />
                        <TextField
                            label="Notlar"
                            multiline
                            rows={3}
                            fullWidth
                            value={newOrder.Notes || ''}
                            onChange={(e) => setNewOrder({ ...newOrder, Notes: e.target.value })}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenCreate(false)}>İptal</Button>
                    <Button variant="contained" onClick={handleCreateOrder} disabled={creating}>
                        {creating ? <CircularProgress size={24} /> : 'Oluştur'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detay Modalı */}
            <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
                <DialogTitle>Üretim Emri Detayı - {selectedOrder?.WorkOrderNumber}</DialogTitle>
                <DialogContent dividers>
                    {selectedOrder && (
                        <Box>
                            <Typography><strong>Ürün:</strong> {selectedOrder.ProductName}</Typography>
                            <Typography><strong>Planlanan Miktar:</strong> {selectedOrder.PlannedQuantity}</Typography>
                            <Typography><strong>Gerçekleşen Miktar:</strong> {selectedOrder.ActualQuantity}</Typography>
                            <Typography><strong>Durum:</strong> <Chip label={selectedOrder.Status} color={statusColors[selectedOrder.Status]} size="small" /></Typography>
                            <Typography variant="h6" sx={{ mt: 2 }}>Malzeme Listesi</Typography>
                            <TableContainer component={Paper} sx={{ mt: 1 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Malzeme Adı</TableCell>
                                            <TableCell>Gereken Miktar</TableCell>
                                            <TableCell>Çekilen Miktar</TableCell>
                                            <TableCell>Mevcut Stok</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {selectedOrder.Materials.map((m) => (
                                            <TableRow key={m.MaterialId}>
                                                <TableCell>{m.MaterialName}</TableCell>
                                                <TableCell>{m.RequiredQuantity}</TableCell>
                                                <TableCell>{m.IssuedQuantity}</TableCell>
                                                <TableCell>{m.AvailableStock}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDetail(false)}>Kapat</Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={5000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%', borderRadius: 3, boxShadow: 4 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}