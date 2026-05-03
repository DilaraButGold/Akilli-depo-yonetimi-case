import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    TablePagination, TextField, Button, Typography, Box, Card, CardContent, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, AppBar, Toolbar,
    Tooltip, Alert, Snackbar, Stack, createTheme, ThemeProvider, CssBaseline, alpha,
    MenuItem, Select, FormControl, InputLabel, Avatar, Chip, LinearProgress
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
    Inventory as InventoryIcon, Refresh as RefreshIcon,
    CheckCircle as StatusIcon, History as HistoryIcon, LocationOn as LocationIcon,
    ViewModule as GridIcon, PictureAsPdf as PictureAsPdfIcon, Logout as LogoutIcon,
    Assignment as AssignmentIcon, WarningAmber as WarningAmberIcon
} from '@mui/icons-material';
import * as signalR from '@microsoft/signalr';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import axiosInstance from '../utils/axiosConfig';
import { Link } from 'react-router-dom';
import React from 'react';

// Bileşenler
import StockMovementModal from '../components/dashboard/StockMovementModal';
import RackDetailModal from '../components/dashboard/RackDetailModal';
import PredictionModal from '../components/dashboard/PredictionModal';

// Sabitler
import { MAIN_ZONES, AISLES_PER_ZONE, SHELVES_PER_AISLE, COLORS } from '../constants/warehouseConstants';

interface Product { Id: number; Name: string; Barcode: string; Description: string; CompanyId: string; }
interface Zone { Id: number; Name: string; }

interface DashboardProps {
    user: any;
    onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
    const theme = useMemo(() => createTheme({
        palette: { mode: 'dark', primary: { main: '#818cf8' }, secondary: { main: '#34d399' }, info: { main: '#0ea5e9' }, error: { main: '#fb7185' }, background: { default: '#0f172a', paper: '#1e293b' }, text: { primary: '#f1f5f9', secondary: '#94a3b8' } },
        shape: { borderRadius: 16 },
        typography: { fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif', h4: { fontWeight: 800, letterSpacing: '-0.02em' }, h6: { fontWeight: 700 }, button: { textTransform: 'none', fontWeight: 600 } },
        components: { MuiButton: { styleOverrides: { root: { borderRadius: 12, padding: '10px 20px' }, containedPrimary: { background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)' } } }, MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } }, MuiDialog: { styleOverrides: { paper: { backgroundImage: 'none' } } } },
    }), []);

    const [products, setProducts] = useState<Product[]>([]);
    const [zones, setZones] = useState<Zone[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(25);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState({ TotalProducts: 0, RecentMovementsCount: 0, Status: 'Sistem Aktif' });

    const [openModal, setOpenModal] = useState(false);
    const [openMovementModal, setOpenMovementModal] = useState(false);
    const [openDeleteModal, setOpenDeleteModal] = useState(false);
    const [openRackModal, setOpenRackModal] = useState(false);

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [formData, setFormData] = useState({ Name: '', Barcode: '', Description: '' });

    const [currentStock, setCurrentStock] = useState<number | null>(null);
    const [movementData, setMovementData] = useState({ Quantity: 1, MovementType: 'IN' });
    const [selectedMainZone, setSelectedMainZone] = useState('A');
    const [selectedLocation, setSelectedLocation] = useState('A-K1-R1');
    const [zoneOccupancy, setZoneOccupancy] = useState<Record<string, { stock: number; capacity: number; }>>({});
    const [rackDetails, setRackDetails] = useState<any[]>([]);
    const [selectedRackName, setSelectedRackName] = useState('');

    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });
    const [manualBarcode, setManualBarcode] = useState('');
    const [predictions, setPredictions] = useState<any[]>([]);

    const [rackStocks, setRackStocks] = useState<Record<number, number>>({});
    const [predictionModalOpen, setPredictionModalOpen] = useState(false);

    const getChartData = useCallback(() => {
        return MAIN_ZONES.map(zone => ({
            name: `Bölge ${zone}`,
            value: zoneOccupancy[zone]?.stock || 0,
            capacity: zoneOccupancy[zone]?.capacity || 1400,
            fullName: zone
        }));
    }, [zoneOccupancy]);

    const handleDownloadPdf = async () => {
        try {
            const response = await axiosInstance.get(`/stockmovements/report/pdf`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `DepoRaporu_${new Date().toISOString().slice(0, 10)}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setNotification({ open: true, message: 'PDF rapor indiriliyor...', severity: 'success' });
        } catch (error) {
            console.error("PDF indirme hatası:", error);
            setNotification({ open: true, message: 'PDF indirilemedi!', severity: 'error' });
        }
    };

    const calculateZoneOccupancy = useCallback(async () => {
        try {
            const res = await axiosInstance.get(`/stockmovements/occupancies`);
            if (res.data.Success) {
                const data = res.data.Data;
                const allZones = ['A', 'B', 'C', 'D', 'E', 'F'];
                const completeData: Record<string, { stock: number; capacity: number; }> = {};
                allZones.forEach(zone => {
                    const zoneData = data[zone];
                    if (zoneData && typeof zoneData === 'object') {
                        const stock = zoneData.stock !== undefined ? zoneData.stock : zoneData.Stock;
                        const capacity = zoneData.capacity !== undefined ? zoneData.capacity : zoneData.Capacity;
                        if (stock !== undefined && capacity !== undefined) {
                            const safeStock = Math.max(0, Number(stock));
                            completeData[zone] = { stock: safeStock, capacity: Number(capacity) };
                        } else {
                            completeData[zone] = { stock: 0, capacity: 1400 };
                        }
                    } else {
                        completeData[zone] = { stock: 0, capacity: 1400 };
                    }
                });
                setZoneOccupancy(completeData);
            }
        } catch (error) {
            console.error("Doluluk verileri çekilemedi", error);
        }
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const prodRes = await axiosInstance.get(`/products/get-all`, { params: { page: page + 1, pageSize, searchTerm } });
            const sumRes = await axiosInstance.get(`/stockmovements/summary`);
            const zoneRes = await axiosInstance.get(`/warehousezones/get-all`, { params: { page: 1, pageSize: 500 } });
            if (prodRes.data.Success) { setProducts(prodRes.data.Data); setTotalCount(prodRes.data.TotalCount); }
            if (sumRes.data.Success) setSummary(sumRes.data);
            if (zoneRes.data.Success) {
                setZones(zoneRes.data.Data);
                await calculateZoneOccupancy();
            }
        } catch (error) {
            setNotification({ open: true, message: 'Sunucuyla bağlantı kurulamadı!', severity: 'error' });
        } finally { setLoading(false); }
    }, [page, pageSize, searchTerm, calculateZoneOccupancy]);

    const fetchSummaryQuietly = useCallback(async () => {
        try {
            const sumRes = await axiosInstance.get(`/stockmovements/summary`);
            if (sumRes.data.Success) setSummary(sumRes.data);
            calculateZoneOccupancy();
        } catch (error) { console.error("Özet verileri güncellenemedi."); }
    }, [calculateZoneOccupancy]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        const connection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5041/warehouseHub")
            .withAutomaticReconnect()
            .build();
        connection.start().then(() => console.log("🟢 Akıllı Depo Sensör Ağına Bağlanıldı!")).catch(err => console.error("🔴 SignalR Bağlantı Hatası: ", err));
        connection.on("ReceiveStockUpdate", (data) => {
            setNotification({ open: true, message: data.Message, severity: 'info' });
            fetchSummaryQuietly();
        });
        return () => { connection.stop(); };
    }, [fetchSummaryQuietly]);

    useEffect(() => {
        Object.entries(zoneOccupancy).forEach(([zone, { stock }]) => {
            if (stock < 50 && stock > 0) {
                setNotification({ open: true, message: `${zone} Bölgesi stok seviyesi kritik! (${stock} ürün)`, severity: 'warning' });
            }
        });
    }, [zoneOccupancy]);

    const handleOpenMovementModal = async (product: Product) => {
        setSelectedProduct(product);
        setCurrentStock(null);
        setMovementData({ Quantity: 1, MovementType: 'IN' });
        setSelectedMainZone('A');
        setSelectedLocation('A-K1-R1');
        setOpenMovementModal(true);
        try {
            const res = await axiosInstance.get(`/stockmovements/current-stock/${product.Id}`);
            setCurrentStock(res.data.Stock);
        } catch (error) { }
    };

    const handleBarcodeSearch = async () => {
        if (!manualBarcode.trim()) {
            setNotification({ open: true, message: 'Lütfen bir barkod girin.', severity: 'warning' });
            return;
        }
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/products/get-all`, {
                params: { searchTerm: manualBarcode.trim(), page: 1, pageSize: 1 }
            });
            if (res.data.Success && res.data.Data.length > 0) {
                const product: Product = res.data.Data[0];
                handleOpenMovementModal(product);
                setManualBarcode('');
            } else {
                setNotification({ open: true, message: 'Barkoda ait ürün bulunamadı.', severity: 'error' });
            }
        } catch (error) {
            setNotification({ open: true, message: 'Ürün sorgulama hatası!', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchPredictions = async () => {
        try {
            const res = await axiosInstance.get('/prediction/stock-forecast');
            if (res.data?.predictions) {
                setPredictions(res.data.predictions.filter((p: any) => p.warning));
            }
        } catch (err) {
            console.error('Tahmin verisi alınamadı', err);
        }
    };

    useEffect(() => {
        fetchPredictions();
        const interval = setInterval(fetchPredictions, 300000);
        return () => clearInterval(interval);
    }, []);

    const loadRackStatuses = async (mainZone: string) => {
        const filteredZones = zones.filter(z => z.Name.startsWith(mainZone + '-'));
        const statuses: Record<number, number> = {};
        for (const z of filteredZones) {
            try {
                const res = await axiosInstance.get(`/stockmovements/rack-details/${z.Id}`);
                if (res.data.Success && res.data.Data.length > 0) {
                    const total = res.data.Data.reduce((sum: number, item: any) => {
                        const qty = item.quantity ?? item.Quantity ?? 0;
                        return sum + qty;
                    }, 0);
                    statuses[z.Id] = total;
                } else {
                    statuses[z.Id] = 0;
                }
            } catch (e) {
                statuses[z.Id] = 0;
            }
        }
        setRackStocks(statuses);
    };

    useEffect(() => {
        if (openMovementModal) {
            loadRackStatuses(selectedMainZone);
        }
    }, [selectedMainZone, openMovementModal, zones]);

    const handleRackClick = async (zoneId: number, rackName: string) => {
        try {
            const res = await axiosInstance.get(`/stockmovements/rack-details/${zoneId}`);
            if (res.data.Success) {
                const formattedData = res.data.Data.map((item: any) => ({
                    productId: item.productId || item.ProductId,
                    productName: item.productName || item.ProductName,
                    quantity: item.quantity || item.Quantity,
                    companyId: item.companyId || item.CompanyId
                }));
                setRackDetails(formattedData);
                setSelectedRackName(rackName);
                setOpenRackModal(true);
            }
        } catch (error) {
            console.error("Raf detayları alınamadı", error);
        }
    };

    const handleSaveMovement = async () => {
        if (!selectedProduct) return;
        const currentOcc = zoneOccupancy[selectedMainZone] || { stock: 0, capacity: 1400 };
        if (movementData.MovementType === 'IN' && (currentOcc.stock + movementData.Quantity > currentOcc.capacity)) {
            setNotification({ open: true, message: `${selectedMainZone} Bölgesi Kapasite Sınırını (${currentOcc.capacity}) Aşıyor! İşlem Reddedildi.`, severity: 'error' });
            return;
        }
        try {
            let zoneId = zones.find(z => z.Name === selectedLocation)?.Id;
            if (!zoneId) {
                const createRes = await axiosInstance.post(`/warehousezones/create`, { Name: selectedLocation, Description: `${selectedMainZone} Bölgesi, Fiziksel Raf Konumu` });
                zoneId = createRes.data.Id;
            }
            const res = await axiosInstance.post(`/stockmovements/add`, { ProductId: selectedProduct.Id, WarehouseZoneId: zoneId, Quantity: movementData.Quantity, MovementType: movementData.MovementType });
            if (res.data.Success) {
                setNotification({ open: true, message: `${selectedLocation} konumuna stok işlemi başarıyla tamamlandı.`, severity: 'success' });
                setOpenMovementModal(false);
                await fetchData();
            }
        } catch (error: any) {
            let errorMessage = "İşlem başarısız!";
            if (error.response?.data) {
                if (typeof error.response.data === 'string') errorMessage = error.response.data;
                else if (error.response.data.message) errorMessage = error.response.data.message;
                else if (error.response.data.Message) errorMessage = error.response.data.Message;
            }
            if (errorMessage.includes("farklı bir ürün") || errorMessage.includes("different product")) errorMessage = "⚠️ Bu rafta zaten farklı bir ürün var! Aynı rafa sadece aynı ürünü ekleyebilirsiniz.";
            else if (errorMessage.includes("Kapasite aşımı") || errorMessage.includes("capacity")) errorMessage = "⚠️ Bu bölgenin kapasitesi dolu! Stok girişi yapılamaz.";
            setNotification({ open: true, message: errorMessage, severity: 'error' });
        }
    };

    const handleSaveProduct = async () => {
        try {
            const endpoint = selectedProduct ? 'update' : 'create';
            const payload = selectedProduct ? { Id: selectedProduct.Id, ...formData } : { ...formData };
            await axiosInstance.post(`/products/${endpoint}`, payload);
            setNotification({ open: true, message: 'Ürün kaydı güncellendi.', severity: 'success' });
            setOpenModal(false);
            fetchData();
        } catch (error) {
            setNotification({ open: true, message: 'İşlem başarısız!', severity: 'error' });
        }
    };

    const handleDeleteProduct = async () => {
        if (!selectedProduct) return;
        try {
            await axiosInstance.post(`/products/delete`, selectedProduct.Id, { headers: { 'Content-Type': 'application/json' } });
            setNotification({ open: true, message: 'Ürün arşivlendi.', severity: 'success' });
            setOpenDeleteModal(false);
            fetchData();
        } catch (error) {
            setNotification({ open: true, message: 'Silme hatası!', severity: 'error' });
        }
    };

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Box sx={{ minHeight: '100vh', pb: 8, bgcolor: 'background.default', backgroundImage: 'radial-gradient(at 0% 0%, rgba(99, 102, 241, 0.1) 0, transparent 50%), radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.05) 0, transparent 50%)' }}>
                <AppBar position="sticky" elevation={0} sx={{ background: alpha('#0f172a', 0.8), backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <Toolbar sx={{ justifyContent: 'space-between', height: 72 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 44, height: 44, borderRadius: 3, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)' }}><InventoryIcon /></Avatar>
                            <Box><Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 800 }}>SMART WAREHOUSE</Typography><Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1 }}>MANAGEMENT SYSTEM</Typography></Box>
                        </Box>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {user?.fullName} ({user?.role})
                            </Typography>
                            <Button component={Link} to="/workorders" variant="outlined" startIcon={<AssignmentIcon />} size="small" sx={{ borderColor: 'primary.main', color: 'primary.main' }}>
                                Üretim Emirleri
                            </Button>
                            <Tooltip title="Kritik Stok Uyarıları">
                                <IconButton onClick={() => setPredictionModalOpen(true)} sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}>
                                    <WarningAmberIcon fontSize="small" color="warning" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Verileri Yenile"><IconButton onClick={fetchData} sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="PDF Rapor İndir"><IconButton onClick={handleDownloadPdf} sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}><PictureAsPdfIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="Çıkış Yap"><IconButton onClick={onLogout} sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}><LogoutIcon fontSize="small" /></IconButton></Tooltip>
                        </Stack>
                    </Toolbar>
                </AppBar>

                <Container maxWidth="lg" sx={{ mt: 6 }}>
                    {/* Özet Kartları */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 6 }}>
                        {[
                            { label: 'Envanter Çeşidi', value: summary.TotalProducts, icon: <InventoryIcon />, color: '#6366f1' },
                            { label: 'Aktivite Kaydı', value: summary.RecentMovementsCount, icon: <HistoryIcon />, color: '#10b981' },
                            { label: 'Sistem Durumu', value: summary.Status, icon: <StatusIcon />, color: '#f59e0b' }
                        ].map((item, idx) => (
                            <Card key={idx} sx={{ borderRadius: 4, position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, #1e293b 0%, #111827 100%)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)', '&:after': { content: '""', position: 'absolute', top: 0, right: 0, width: '40%', height: '100%', background: `radial-gradient(circle at center, ${alpha(item.color, 0.08)} 0%, transparent 70%)` } }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Stack direction="row" spacing={2} alignItems="center">
                                        <Box sx={{ width: 52, height: 52, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: alpha(item.color, 0.1), color: item.color, border: `1px solid ${alpha(item.color, 0.2)}` }}>{React.cloneElement(item.icon as React.ReactElement<any>, { sx: { fontSize: 28 } })}</Box>
                                        <Box><Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{item.value}</Typography><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', mt: 0.5, display: 'block' }}>{item.label}</Typography></Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>

                    {/* Barkod ile Hızlı İşlem */}
                    <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField label="Barkod ile Hızlı İşlem" variant="outlined" size="small" value={manualBarcode} onChange={(e) => setManualBarcode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSearch()} sx={{ width: 300, bgcolor: 'background.paper', borderRadius: 2 }} />
                        <Button variant="contained" onClick={handleBarcodeSearch} disabled={loading} startIcon={<SearchIcon />}>Ara ve İşlem Yap</Button>
                    </Box>

                    {/* GRAFİK BÖLÜMÜ */}
                    <Box sx={{ mb: 6 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>Bölge Doluluk Grafikleri</Typography>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center">
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, background: '#111827', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>Bölgelere Göre Stok Dağılımı</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie data={getChartData().filter(d => d.value > 0)} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} %${((percent ?? 0) * 100).toFixed(0)}`} outerRadius={100} fill="#8884d8" dataKey="value">
                                            {getChartData().map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} itemStyle={{ color: '#f1f5f9' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                {getChartData().filter(d => d.value > 0).length === 0 && (<Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>Henüz stok bulunmuyor</Typography>)}
                            </Paper>
                            <Paper elevation={0} sx={{ p: 3, borderRadius: 4, background: '#111827', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>Bölge Kapasite Kullanımı (%)</Typography>
                                <Box sx={{ height: 300, overflowY: 'auto', pr: 2 }}>
                                    {MAIN_ZONES.map((zone) => {
                                        const zoneData = zoneOccupancy[zone];
                                        const stock = zoneData?.stock ?? 0;
                                        const capacity = zoneData?.capacity ?? 1400;
                                        const percentValue = capacity > 0 ? Math.round((stock / capacity) * 100) : 0;
                                        return (
                                            <Box key={zone} sx={{ mb: 2 }}>
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}><Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>Bölge {zone}</Typography><Typography variant="caption" sx={{ color: percentValue > 90 ? 'error.main' : percentValue > 70 ? 'warning.main' : 'success.main', fontWeight: 600 }}>{percentValue}%</Typography></Stack>
                                                <Box sx={{ width: '100%', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, height: 10 }}><Box sx={{ width: `${percentValue}%`, height: '100%', borderRadius: 2, background: percentValue > 90 ? 'linear-gradient(90deg, #ef4444, #f87171)' : percentValue > 70 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #34d399, #6ee7b7)', transition: 'width 0.5s ease' }} /></Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Paper>
                        </Stack>
                    </Box>

                    {/* Ürün Tablosu */}
                    <Paper elevation={0} sx={{ p: 4, borderRadius: 5, background: '#111827', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 5 }} justifyContent="space-between" alignItems="center">
                            <TextField variant="outlined" size="small" placeholder="ID, İsim veya Barkod ile ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ width: { xs: '100%', sm: 380 }, '& .MuiOutlinedInput-root': { bgcolor: alpha('#000', 0.2), borderRadius: 3, height: 48 } }} InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1.5, color: 'text.secondary' }} /> }} />
                            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setSelectedProduct(null); setFormData({ Name: '', Barcode: '', Description: '' }); setOpenModal(true); }} sx={{ height: 48, px: 4 }}>Yeni Ürün Tanımla</Button>
                        </Stack>
                        <TableContainer>
                            <Table>
                                <TableHead><TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.05)', pb: 2, color: 'text.secondary', fontWeight: 700 } }}><TableCell>REF ID</TableCell><TableCell>ÜRÜN BİLGİSİ</TableCell><TableCell>BARKOD</TableCell><TableCell align="right">İŞLEMLER</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {loading ? (<TableRow><TableCell colSpan={4} align="center" sx={{ py: 12 }}><CircularProgress size={32} thickness={5} /></TableCell></TableRow>) : products.length === 0 ? (<TableRow><TableCell colSpan={4} align="center" sx={{ py: 12, color: 'text.secondary' }}>Arama kriterlerine uygun ürün bulunamadı.</TableCell></TableRow>) : (
                                        products.map((row) => (
                                            <TableRow key={row.Id} hover sx={{ '&:hover': { bgcolor: alpha('#6366f1', 0.04) }, '& td': { borderBottom: '1px solid rgba(255,255,255,0.03)', py: 2.5 } }}>
                                                <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 500 }}>#{row.Id}</TableCell>
                                                <TableCell><Typography variant="body2" sx={{ fontWeight: 700 }}>{row.Name}</Typography><Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{row.Description || 'Açıklama belirtilmemiş'}</Typography></TableCell>
                                                <TableCell><Chip label={row.Barcode} size="small" sx={{ borderRadius: 1.5, fontFamily: 'monospace', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)' }} /></TableCell>
                                                <TableCell align="right">
                                                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                                                        <Tooltip title="Depo Haritası / Stok İşlemi"><IconButton size="small" sx={{ color: 'secondary.main', bgcolor: alpha('#10b981', 0.05) }} onClick={() => handleOpenMovementModal(row)}><GridIcon fontSize="small" /></IconButton></Tooltip>
                                                        <Tooltip title="Düzenle"><IconButton size="small" sx={{ color: 'primary.main', bgcolor: alpha('#6366f1', 0.05) }} onClick={() => { setSelectedProduct(row); setFormData({ Name: row.Name, Barcode: row.Barcode, Description: row.Description }); setOpenModal(true); }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                                                        <Tooltip title="Arşivle"><IconButton size="small" sx={{ color: 'error.main', bgcolor: alpha('#fb7185', 0.05) }} onClick={() => { setSelectedProduct(row); setOpenDeleteModal(true); }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                                                    </Stack>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination component="div" count={totalCount} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={pageSize} onRowsPerPageChange={(e) => setPageSize(parseInt(e.target.value))} labelRowsPerPage="Kayıt Sayısı:" sx={{ color: 'text.secondary', pt: 2 }} />
                    </Paper>
                </Container>

                {/* Görsel Depo Haritası Modalı */}
                <StockMovementModal
                    open={openMovementModal}
                    onClose={() => setOpenMovementModal(false)}
                    selectedProduct={selectedProduct}
                    zones={zones}
                    zoneOccupancy={zoneOccupancy}
                    selectedMainZone={selectedMainZone}
                    setSelectedMainZone={setSelectedMainZone}
                    selectedLocation={selectedLocation}
                    setSelectedLocation={setSelectedLocation}
                    handleRackClick={handleRackClick}
                    movementData={movementData}
                    setMovementData={setMovementData}
                    currentStock={currentStock}
                    handleSaveMovement={handleSaveMovement}
                    rackStocks={rackStocks}
                    axiosInstance={axiosInstance}   // 🆕 Prop olarak geçildi
                />

                {/* Raf Detay Modalı */}
                <RackDetailModal
                    open={openRackModal}
                    onClose={() => setOpenRackModal(false)}
                    rackName={selectedRackName}
                    rackDetails={rackDetails}
                />

                {/* Tahmin Modalı */}
                <PredictionModal
                    open={predictionModalOpen}
                    onClose={() => setPredictionModalOpen(false)}
                    predictions={predictions}
                />

                {/* Ürün Modalı */}
                <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 5, bgcolor: '#111827' } }}>
                    <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>{selectedProduct ? 'Ürün Bilgilerini Güncelle' : 'Yeni Ürün Kaydı'}</DialogTitle>
                    <DialogContent><Stack spacing={3} sx={{ mt: 1 }}><TextField label="Ürün Adı" fullWidth required value={formData.Name} onChange={(e) => setFormData({ ...formData, Name: e.target.value })} /><TextField label="Barkod Numarası" fullWidth required value={formData.Barcode} onChange={(e) => setFormData({ ...formData, Barcode: e.target.value })} /><TextField label="Ürün Açıklaması" multiline rows={3} fullWidth value={formData.Description} onChange={(e) => setFormData({ ...formData, Description: e.target.value })} /></Stack></DialogContent>
                    <DialogActions sx={{ p: 4, pt: 0 }}><Button onClick={() => setOpenModal(false)}>İptal</Button><Button variant="contained" onClick={handleSaveProduct}>Kaydet</Button></DialogActions>
                </Dialog>

                {/* Silme Onay Modalı */}
                <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}>
                    <DialogTitle sx={{ fontWeight: 800 }}>Arşivleme Onayı</DialogTitle>
                    <DialogContent><Typography color="text.secondary">Bu ürünü arşivlemek (soft-delete) istediğinizden emin misiniz? Hareket kayıtları korunacaktır.</Typography></DialogContent>
                    <DialogActions sx={{ p: 3 }}><Button onClick={() => setOpenDeleteModal(false)}>Geri Dön</Button><Button color="error" variant="contained" onClick={handleDeleteProduct}>Evet, Arşivle</Button></DialogActions>
                </Dialog>

                <Snackbar open={notification.open} autoHideDuration={5000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                    <Alert severity={notification.severity} variant="filled" sx={{ borderRadius: 3, boxShadow: 10 }}>{notification.message}</Alert>
                </Snackbar>
            </Box>
        </ThemeProvider>
    );
}