import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, Button, Typography, Box, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, AppBar, Toolbar,
  Tooltip, Alert, Snackbar, Stack, createTheme, ThemeProvider, CssBaseline, alpha,
  MenuItem, Select, FormControl, InputLabel, Avatar, Chip, LinearProgress
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
  Inventory as InventoryIcon, SwapHoriz as MovementIcon, Refresh as RefreshIcon,
  CheckCircle as StatusIcon, History as HistoryIcon, LocationOn as LocationIcon,
  ViewModule as GridIcon, PictureAsPdf as PictureAsPdfIcon
} from '@mui/icons-material';
import axios from 'axios';
import * as signalR from '@microsoft/signalr';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';

interface Product { Id: number; Name: string; Barcode: string; Description: string; CompanyId: string; }
interface Zone { Id: number; Name: string; }

const API_URL = 'http://localhost:5041/api';
const SIGNALR_URL = 'http://localhost:5041/warehouseHub';
const DEFAULT_COMPANY_ID = 'COMP-101';

// DEPO FİZİKSEL YAPISI
const MAIN_ZONES = ['A', 'B', 'C', 'D', 'E', 'F'];
const AISLES_PER_ZONE = 4;
const SHELVES_PER_AISLE = 7;

// Renk paleti
const COLORS = ['#6366f1', '#34d399', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function App() {
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

  // GÖRSEL DEPO YÖNETİMİ STATE'LERİ
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [movementData, setMovementData] = useState({ Quantity: 1, MovementType: 'IN' });
  const [selectedMainZone, setSelectedMainZone] = useState('A');
  const [selectedLocation, setSelectedLocation] = useState('A-K1-R1');
  const [zoneOccupancy, setZoneOccupancy] = useState<Record<string, { stock: number; capacity: number; }>>({});
  const [rackDetails, setRackDetails] = useState<any[]>([]);
  const [selectedRackName, setSelectedRackName] = useState('');

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' | 'info' | 'warning' });

  // Grafik için veri hazırlama
  const getChartData = useCallback(() => {
    return MAIN_ZONES.map(zone => ({
      name: `Bölge ${zone}`,
      value: zoneOccupancy[zone]?.stock || 0,
      capacity: zoneOccupancy[zone]?.capacity || 1400,
      fullName: zone
    }));
  }, [zoneOccupancy]);

  // PDF İndirme Fonksiyonu
  const handleDownloadPdf = async () => {
    try {
      const response = await axios.get(`${API_URL}/stockmovements/report/pdf`, {
        params: { companyId: DEFAULT_COMPANY_ID },
        responseType: 'blob'
      });

      // Blob'u indir
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `DepoRaporu_${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setNotification({
        open: true,
        message: 'PDF rapor indiriliyor...',
        severity: 'success'
      });
    } catch (error) {
      console.error("PDF indirme hatası:", error);
      setNotification({
        open: true,
        message: 'PDF indirilemedi!',
        severity: 'error'
      });
    }
  };

  // GERÇEK VERİLERİ API'DEN ÇEKEN FONKSİYON
  const calculateZoneOccupancy = useCallback(async () => {
    console.log("calculateZoneOccupancy çağrıldı");
    try {
      const res = await axios.get(`${API_URL}/stockmovements/occupancies`, {
        params: { companyId: DEFAULT_COMPANY_ID }
      });
      console.log("occupancies response:", res.data);
      if (res.data.Success) {
        const data = res.data.Data;
        console.log("Ham gelen data:", JSON.stringify(data, null, 2));

        const allZones = ['A', 'B', 'C', 'D', 'E', 'F'];
        const completeData: Record<string, { stock: number; capacity: number; }> = {};

        allZones.forEach(zone => {
          const zoneData = data[zone];
          if (zoneData && typeof zoneData === 'object') {
            const stock = zoneData.stock !== undefined ? zoneData.stock : zoneData.Stock;
            const capacity = zoneData.capacity !== undefined ? zoneData.capacity : zoneData.Capacity;
            if (stock !== undefined && capacity !== undefined) {
              completeData[zone] = { stock, capacity };
            } else {
              completeData[zone] = { stock: 0, capacity: 1400 };
            }
          } else {
            completeData[zone] = { stock: 0, capacity: 1400 };
          }
          console.log(`Zone ${zone}: stock=${completeData[zone].stock}, capacity=${completeData[zone].capacity}`);
        });

        console.log("İşlenmiş zoneOccupancy:", JSON.stringify(completeData, null, 2));
        setZoneOccupancy(completeData);
      }
    } catch (error) {
      console.error("Doluluk verileri çekilemedi", error);
    }
  }, []);

  const fetchData = useCallback(async () => {
    console.log("fetchData çağrıldı");
    setLoading(true);
    try {
      const prodRes = await axios.get(`${API_URL}/products/get-all`, { params: { companyId: DEFAULT_COMPANY_ID, page: page + 1, pageSize, searchTerm } });
      const sumRes = await axios.get(`${API_URL}/stockmovements/summary`, { params: { companyId: DEFAULT_COMPANY_ID } });
      const zoneRes = await axios.get(`${API_URL}/warehousezones/get-all`, { params: { companyId: DEFAULT_COMPANY_ID, page: 1, pageSize: 500 } });

      if (prodRes.data.Success) { setProducts(prodRes.data.Data); setTotalCount(prodRes.data.TotalCount); }
      if (sumRes.data.Success) setSummary(sumRes.data);
      if (zoneRes.data.Success) {
        console.log("zoneRes.data:", zoneRes.data);
        setZones(zoneRes.data.Data);
        await calculateZoneOccupancy();
      }
    } catch (error) { setNotification({ open: true, message: 'Sunucuyla bağlantı kurulamadı!', severity: 'error' }); }
    finally { setLoading(false); }
  }, [page, pageSize, searchTerm, calculateZoneOccupancy]);

  const fetchSummaryQuietly = useCallback(async () => {
    try {
      const sumRes = await axios.get(`${API_URL}/stockmovements/summary`, { params: { companyId: DEFAULT_COMPANY_ID } });
      if (sumRes.data.Success) setSummary(sumRes.data);
      calculateZoneOccupancy();
    } catch (error) { console.error("Özet verileri güncellenemedi."); }
  }, [calculateZoneOccupancy]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder().withUrl(SIGNALR_URL).withAutomaticReconnect().build();
    connection.start().then(() => console.log("🟢 Akıllı Depo Sensör Ağına Bağlanıldı!")).catch(err => console.error("🔴 SignalR Bağlantı Hatası: ", err));
    connection.on("ReceiveStockUpdate", (data) => {
      setNotification({ open: true, message: data.Message, severity: 'info' });
      fetchSummaryQuietly();
    });
    return () => { connection.stop(); };
  }, [fetchSummaryQuietly]);

  // Kritik stok uyarıları
  useEffect(() => {
    Object.entries(zoneOccupancy).forEach(([zone, { stock }]) => {
      if (stock < 50 && stock > 0) {
        setNotification({
          open: true,
          message: `${zone} Bölgesi stok seviyesi kritik! (${stock} ürün)`,
          severity: 'warning'
        });
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
      const res = await axios.get(`${API_URL}/stockmovements/current-stock/${product.Id}`, { params: { companyId: DEFAULT_COMPANY_ID } });
      setCurrentStock(res.data.Stock);
    } catch (error) { }
  };

  // Raf detaylarını getiren fonksiyon
  const handleRackClick = async (zoneId: number, rackName: string) => {
    try {
      const res = await axios.get(`${API_URL}/stockmovements/rack-details/${zoneId}`, {
        params: { companyId: DEFAULT_COMPANY_ID }
      });
      if (res.data.Success) {
        // Gelen veriyi formatla (büyük harf küçük harf uyumu)
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
    console.log("handleSaveMovement çağrıldı");
    console.log("selectedProduct:", selectedProduct);
    console.log("selectedLocation:", selectedLocation);
    console.log("movementData:", movementData);

    if (!selectedProduct) return;

    const currentOcc = zoneOccupancy[selectedMainZone] || { stock: 0, capacity: 1400 };
    if (movementData.MovementType === 'IN' && (currentOcc.stock + movementData.Quantity > currentOcc.capacity)) {
      setNotification({
        open: true,
        message: `${selectedMainZone} Bölgesi Kapasite Sınırını (${currentOcc.capacity}) Aşıyor! İşlem Reddedildi.`,
        severity: 'error'
      });
      return;
    }

    try {
      let zoneId = zones.find(z => z.Name === selectedLocation)?.Id;

      if (!zoneId) {
        const createRes = await axios.post(`${API_URL}/warehousezones/create`, {
          Name: selectedLocation,
          Description: `${selectedMainZone} Bölgesi, Fiziksel Raf Konumu`,
          CompanyId: DEFAULT_COMPANY_ID
        });
        zoneId = createRes.data.Id;
      }

      const res = await axios.post(`${API_URL}/stockmovements/add`, {
        ProductId: selectedProduct.Id, WarehouseZoneId: zoneId,
        Quantity: movementData.Quantity, MovementType: movementData.MovementType, CompanyId: DEFAULT_COMPANY_ID
      });

      if (res.data.Success) {
        console.log("Stok girişi başarılı, fetchData çağrılıyor...");
        setNotification({ open: true, message: `${selectedLocation} konumuna stok işlemi başarıyla tamamlandı.`, severity: 'success' });
        setOpenMovementModal(false);
        await fetchData();
        console.log("fetchData tamamlandı, zoneOccupancy güncellendi mi?", zoneOccupancy);
      }
    } catch (error: any) {
      console.error("Hata detayı:", error);
      console.error("Response:", error.response);

      // Backend'den gelen hatayı güvenli bir şekilde string'e çevir
      let errorMessage = "İşlem başarısız!";

      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.Message) {
          errorMessage = error.response.data.Message;
        } else {
          try {
            // Backend'den gelen hatayı parse et (exception mesajı için)
            const errorObj = error.response.data;
            if (errorObj.error) {
              errorMessage = errorObj.error;
            } else if (errorObj.title) {
              errorMessage = errorObj.title;
            } else {
              errorMessage = JSON.stringify(errorObj);
            }
          } catch {
            errorMessage = JSON.stringify(error.response.data);
          }
        }
      }

      // Özel hata mesajlarını daha anlaşılır yap
      if (errorMessage.includes("farklı bir ürün") || errorMessage.includes("different product")) {
        errorMessage = "⚠️ Bu rafta zaten farklı bir ürün var! Aynı rafa sadece aynı ürünü ekleyebilirsiniz.";
      } else if (errorMessage.includes("Kapasite aşımı") || errorMessage.includes("capacity")) {
        errorMessage = "⚠️ Bu bölgenin kapasitesi dolu! Stok girişi yapılamaz.";
      }

      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleSaveProduct = async () => {
    try {
      const endpoint = selectedProduct ? 'update' : 'create';
      const payload = selectedProduct ? { Id: selectedProduct.Id, ...formData, CompanyId: DEFAULT_COMPANY_ID } : { ...formData, CompanyId: DEFAULT_COMPANY_ID };
      await axios.post(`${API_URL}/products/${endpoint}`, payload);
      setNotification({ open: true, message: 'Ürün kaydı güncellendi.', severity: 'success' });
      setOpenModal(false);
      fetchData();
    } catch (error) { setNotification({ open: true, message: 'İşlem başarısız!', severity: 'error' }); }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    try {
      await axios.post(`${API_URL}/products/delete?companyId=${DEFAULT_COMPANY_ID}`, selectedProduct.Id, { headers: { 'Content-Type': 'application/json' } });
      setNotification({ open: true, message: 'Ürün arşivlendi.', severity: 'success' });
      setOpenDeleteModal(false);
      fetchData();
    } catch (error) { setNotification({ open: true, message: 'Silme hatası!', severity: 'error' }); }
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
              <Tooltip title="Verileri Yenile"><IconButton onClick={fetchData} sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="PDF Rapor İndir">
                <IconButton
                  onClick={handleDownloadPdf}
                  sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}
                >
                  <PictureAsPdfIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Chip label={DEFAULT_COMPANY_ID} size="small" sx={{ bgcolor: alpha('#6366f1', 0.15), color: 'primary.main', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.2)' }} />
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

          {/* GRAFİK BÖLÜMÜ */}
          <Box sx={{ mb: 6 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              Bölge Doluluk Grafikleri
            </Typography>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center">
              {/* Pasta Grafik */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, background: '#111827', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>
                  Bölgelere Göre Stok Dağılımı
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getChartData().filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} %${(percent * 100).toFixed(0)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getChartData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      itemStyle={{ color: '#f1f5f9' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                {getChartData().filter(d => d.value > 0).length === 0 && (
                  <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                    Henüz stok bulunmuyor
                  </Typography>
                )}
              </Paper>

              {/* Çubuk Grafik (Kapasite Kullanımı) */}
              <Paper elevation={0} sx={{ p: 3, borderRadius: 4, background: '#111827', border: '1px solid rgba(255,255,255,0.05)', flex: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'center' }}>
                  Bölge Kapasite Kullanımı (%)
                </Typography>
                <Box sx={{ height: 300, overflowY: 'auto', pr: 2 }}>
                  {MAIN_ZONES.map((zone, index) => {
                    const data = zoneOccupancy[zone] || { stock: 0, capacity: 1400 };
                    const percent = data.capacity > 0 ? Math.round((data.stock / data.capacity) * 100) : 0;

                    return (
                      <Box key={zone} sx={{ mb: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Bölge {zone}
                          </Typography>
                          <Typography variant="caption" sx={{ color: percent > 90 ? 'error.main' : percent > 70 ? 'warning.main' : 'success.main', fontWeight: 600 }}>
                            {percent}%
                          </Typography>
                        </Stack>
                        <Box sx={{ width: '100%', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2, height: 10 }}>
                          <Box
                            sx={{
                              width: `${percent}%`,
                              height: '100%',
                              borderRadius: 2,
                              background: percent > 90 ? 'linear-gradient(90deg, #ef4444, #f87171)' :
                                percent > 70 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' :
                                  'linear-gradient(90deg, #34d399, #6ee7b7)',
                              transition: 'width 0.5s ease'
                            }}
                          />
                        </Box>
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

        {/* GÖRSEL DEPO HARİTASI VE STOK MODALI */}
        <Dialog open={openMovementModal} onClose={() => setOpenMovementModal(false)} fullWidth maxWidth="md" PaperProps={{ sx: { borderRadius: 5, bgcolor: '#111827', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.05)' } }}>
          <DialogTitle sx={{ fontWeight: 800, pt: 3, borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <LocationIcon sx={{ color: 'primary.main' }} />
              <Box>
                <Typography variant="h6">Görsel Depo Haritası</Typography>
                <Typography variant="caption" color="text.secondary">Ürün: {selectedProduct?.Name}</Typography>
              </Box>
            </Stack>
          </DialogTitle>
          <DialogContent sx={{ p: 0 }}>
            <Stack direction={{ xs: 'column', md: 'row' }}>

              {/* SOL TARAF: FİZİKSEL DEPO GÖRSELLEŞTİRMESİ */}
              <Box sx={{ flex: 2, p: 3, borderRight: { md: '1px solid rgba(255,255,255,0.05)' } }}>
                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>1. Ana Bölge Seçimi</Typography>

                {/* A-F BÖLGE KUTULARI VE KAPASİTELERİ */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 4 }}>
                  {MAIN_ZONES.map(z => {
                    const occ = zoneOccupancy[z] || { stock: 0, capacity: 1400 };
                    const percent = Math.round((occ.stock / occ.capacity) * 100);
                    const isSelected = selectedMainZone === z;
                    const isFull = occ.stock >= occ.capacity;
                    const isLowStock = occ.stock < 50;

                    let bgColor = 'rgba(255,255,255,0.02)';
                    if (isSelected) bgColor = alpha('#6366f1', 0.15);
                    else if (isFull) bgColor = alpha('#ef4444', 0.2);
                    else if (isLowStock) bgColor = alpha('#f59e0b', 0.2);
                    else if (percent > 70) bgColor = alpha('#fbbf24', 0.1);

                    return (
                      <Paper key={z} onClick={() => setSelectedMainZone(z)}
                        sx={{
                          p: 1.5, cursor: 'pointer', transition: 'all 0.2s',
                          bgcolor: bgColor,
                          border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.05)'}`,
                          '&:hover': { bgcolor: alpha('#6366f1', 0.1) }
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="h6" sx={{ color: isSelected ? 'primary.main' : 'text.primary' }}>{z}</Typography>
                          <Typography variant="caption" sx={{ color: isFull ? 'error.main' : 'text.secondary', fontWeight: 600 }}>
                            {occ.stock} / {occ.capacity}
                          </Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={percent}
                          color={isFull ? "error" : isLowStock ? "warning" : isSelected ? "primary" : "inherit"}
                          sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)' }} />
                      </Paper>
                    );
                  })}
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>2. Koridor ve Raf Haritası ( {selectedMainZone} Bölgesi )</Typography>

                {/* 4 KORİDOR X 7 RAF GRID SİSTEMİ */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 3, border: '1px solid rgba(255,255,255,0.03)' }}>
                  {Array.from({ length: AISLES_PER_ZONE }).map((_, aisleIndex) => {
                    const aisleNum = aisleIndex + 1;
                    return (
                      <Stack key={aisleNum} direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" sx={{ width: 65, color: 'text.secondary', fontWeight: 600 }}>KORİDOR {aisleNum}</Typography>
                        <Stack direction="row" spacing={1} flex={1}>
                          {Array.from({ length: SHELVES_PER_AISLE }).map((_, shelfIndex) => {
                            const shelfNum = shelfIndex + 1;
                            const locStr = `${selectedMainZone}-K${aisleNum}-R${shelfNum}`;
                            const isSelected = selectedLocation === locStr;

                            return (
                              <Tooltip key={shelfNum} title={`${locStr} (Raf ${shelfNum})`}>
                                <Box
                                  onClick={() => {
                                    setSelectedLocation(locStr);
                                    const zoneId = zones.find(z => z.Name === locStr)?.Id;
                                    if (zoneId) handleRackClick(zoneId, locStr);
                                  }}
                                  sx={{
                                    flex: 1, height: 36, borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    bgcolor: isSelected ? 'secondary.main' : 'rgba(255,255,255,0.05)',
                                    color: isSelected ? '#000' : 'text.secondary',
                                    fontWeight: isSelected ? 800 : 500,
                                    border: `1px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.05)'}`,
                                    '&:hover': { bgcolor: isSelected ? 'secondary.main' : 'rgba(255,255,255,0.1)' }
                                  }}
                                >
                                  {shelfNum}
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Stack>
                      </Stack>
                    );
                  })}
                </Box>
              </Box>

              {/* SAĞ TARAF: İŞLEM FORMU */}
              <Box sx={{ flex: 1, p: 3, bgcolor: 'rgba(0,0,0,0.1)' }}>
                <Box sx={{ mb: 4, p: 2.5, bgcolor: alpha('#10b981', 0.1), borderRadius: 3, border: '1px dashed rgba(16, 185, 129, 0.4)' }}>
                  <Typography variant="caption" color="text.secondary" display="block">Hedef Lokasyon</Typography>
                  <Typography variant="h5" sx={{ color: 'secondary.main', fontWeight: 800, letterSpacing: 1 }}>{selectedLocation}</Typography>
                </Box>

                <Stack spacing={3}>
                  <FormControl fullWidth>
                    <InputLabel>İşlem Türü</InputLabel>
                    <Select label="İşlem Türü" value={movementData.MovementType} onChange={(e) => setMovementData({ ...movementData, MovementType: e.target.value as string })}>
                      <MenuItem value="IN">Stok Girişi (Mal Kabul)</MenuItem>
                      <MenuItem value="OUT">Stok Çıkışı (Sevkiyat)</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Miktar" type="number" fullWidth value={movementData.Quantity} onChange={(e) => setMovementData({ ...movementData, Quantity: Math.max(1, parseInt(e.target.value) || 0) })} />

                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Sistem Genel Stok:</Typography>
                    {currentStock === null ? <CircularProgress size={14} /> : <Typography variant="subtitle1" fontWeight="bold">{currentStock} ADET</Typography>}
                  </Box>
                </Stack>
              </Box>

            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Button onClick={() => setOpenMovementModal(false)} sx={{ color: 'text.secondary' }}>Vazgeç</Button>
            <Button variant="contained" onClick={handleSaveMovement} sx={{ px: 4 }}>Tamamla</Button>
          </DialogActions>
        </Dialog>

        {/* RAF DETAY MODALI */}
        <Dialog open={openRackModal} onClose={() => setOpenRackModal(false)} maxWidth="sm" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" spacing={1}>
              <LocationIcon sx={{ color: 'secondary.main' }} />
              <Typography variant="h6">{selectedRackName} Raf Detayı</Typography>
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            {rackDetails.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography color="text.secondary">Bu rafta ürün bulunmuyor.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ürün Adı</TableCell>
                      <TableCell align="right">Miktar</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rackDetails.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={`${item.quantity} adet`}
                            size="small"
                            color={item.quantity > 40 ? "error" : item.quantity > 20 ? "warning" : "success"}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenRackModal(false)}>Kapat</Button>
          </DialogActions>
        </Dialog>

        {/* ÜRÜN MODALI */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 5, bgcolor: '#111827' } }}><DialogTitle sx={{ fontWeight: 800, pt: 3 }}>{selectedProduct ? 'Ürün Bilgilerini Güncelle' : 'Yeni Ürün Kaydı'}</DialogTitle><DialogContent><Stack spacing={3} sx={{ mt: 1 }}><TextField label="Ürün Adı" fullWidth required value={formData.Name} onChange={(e) => setFormData({ ...formData, Name: e.target.value })} /><TextField label="Barkod Numarası" fullWidth required value={formData.Barcode} onChange={(e) => setFormData({ ...formData, Barcode: e.target.value })} /><TextField label="Ürün Açıklaması" multiline rows={3} fullWidth value={formData.Description} onChange={(e) => setFormData({ ...formData, Description: e.target.value })} /></Stack></DialogContent><DialogActions sx={{ p: 4, pt: 0 }}><Button onClick={() => setOpenModal(false)}>İptal</Button><Button variant="contained" onClick={handleSaveProduct}>Kaydet</Button></DialogActions></Dialog>
        <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}><DialogTitle sx={{ fontWeight: 800 }}>Arşivleme Onayı</DialogTitle><DialogContent><Typography color="text.secondary">Bu ürünü arşivlemek (soft-delete) istediğinizden emin misiniz? Hareket kayıtları korunacaktır.</Typography></DialogContent><DialogActions sx={{ p: 3 }}><Button onClick={() => setOpenDeleteModal(false)}>Geri Dön</Button><Button color="error" variant="contained" onClick={handleDeleteProduct}>Evet, Arşivle</Button></DialogActions></Dialog>

        <Snackbar open={notification.open} autoHideDuration={5000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity={notification.severity} variant="filled" sx={{ borderRadius: 3, boxShadow: 10 }}>{notification.message}</Alert></Snackbar>
      </Box>
    </ThemeProvider>
  );
}