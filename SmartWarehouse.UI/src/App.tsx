import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, TextField, Button, Typography, Box, Card, CardContent, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, AppBar, Toolbar,
  Tooltip, Alert, Snackbar, Stack, createTheme, ThemeProvider, CssBaseline, alpha,
  MenuItem, Select, FormControl, InputLabel, Divider, Avatar, Chip
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon,
  Inventory as InventoryIcon, SwapHoriz as MovementIcon, Refresh as RefreshIcon,
  CheckCircle as StatusIcon, MoveToInbox as InIcon, Outbox as OutIcon,
  History as HistoryIcon, ErrorOutline as ErrorIcon, LocalShipping as ShippingIcon
} from '@mui/icons-material';
import axios from 'axios';

// --- TİPLER ---
interface Product {
  Id: number;
  Name: string;
  Barcode: string;
  Description: string;
  CompanyId: string;
}

const API_URL = 'http://localhost:5041/api';
const DEFAULT_COMPANY_ID = 'COMP-101';

export default function App() {
  // --- PREMIUM DARK THEME CONFIG ---
  const theme = useMemo(() => createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#818cf8' }, // Indigo 400
      secondary: { main: '#34d399' }, // Emerald 400
      error: { main: '#fb7185' }, // Rose 400
      background: {
        default: '#0f172a', // Slate 900
        paper: '#1e293b', // Slate 800
      },
      text: {
        primary: '#f1f5f9',
        secondary: '#94a3b8',
      },
    },
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: '"Inter", "system-ui", "-apple-system", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.02em' },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, padding: '10px 20px' },
          containedPrimary: {
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            boxShadow: '0 4px 14px 0 rgba(99, 102, 241, 0.39)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  }), []);

  // --- STATE ---
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ TotalProducts: 0, RecentMovementsCount: 0, Status: 'Sistem Aktif' });

  // Modals
  const [openModal, setOpenModal] = useState(false);
  const [openMovementModal, setOpenMovementModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ Name: '', Barcode: '', Description: '' });

  // Stock Movement State
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [stockLoadError, setStockLoadError] = useState(false);
  const [movementData, setMovementData] = useState({
    Quantity: 1,
    MovementType: 'IN',
    WarehouseZoneId: 1
  });

  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // --- API CALLS ---

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const prodRes = await axios.get(`${API_URL}/products/get-all`, {
        params: { companyId: DEFAULT_COMPANY_ID, page: page + 1, pageSize, searchTerm }
      });
      const sumRes = await axios.get(`${API_URL}/stockmovements/summary`, {
        params: { companyId: DEFAULT_COMPANY_ID }
      });

      if (prodRes.data.Success) {
        setProducts(prodRes.data.Data);
        setTotalCount(prodRes.data.TotalCount);
      }
      if (sumRes.data.Success) {
        setSummary(sumRes.data);
      }
    } catch (error) {
      setNotification({ open: true, message: 'Sunucuyla bağlantı kurulamadı!', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleOpenMovementModal = async (product: Product) => {
    setSelectedProduct(product);
    setCurrentStock(null);
    setStockLoadError(false);
    setMovementData({ Quantity: 1, MovementType: 'IN', WarehouseZoneId: 1 });
    setOpenMovementModal(true);

    try {
      const res = await axios.get(`${API_URL}/stockmovements/current-stock/${product.Id}`, {
        params: { companyId: DEFAULT_COMPANY_ID }
      });
      setCurrentStock(res.data.Stock);
    } catch (error) {
      setStockLoadError(true);
    }
  };

  const handleSaveMovement = async () => {
    if (!selectedProduct) return;
    try {
      const res = await axios.post(`${API_URL}/stockmovements/add`, {
        ProductId: selectedProduct.Id,
        WarehouseZoneId: movementData.WarehouseZoneId,
        Quantity: movementData.Quantity,
        MovementType: movementData.MovementType,
        CompanyId: DEFAULT_COMPANY_ID
      });

      if (res.data.Success) {
        setNotification({ open: true, message: 'Stok işlemi başarıyla tamamlandı.', severity: 'success' });
        setOpenMovementModal(false);
        fetchData();
      }
    } catch (error: any) {
      const msg = error.response?.data?.Message || "İşlem başarısız!";
      setNotification({ open: true, message: msg, severity: 'error' });
    }
  };

  const handleSaveProduct = async () => {
    try {
      const endpoint = selectedProduct ? 'update' : 'create';
      const payload = selectedProduct
        ? { Id: selectedProduct.Id, ...formData, CompanyId: DEFAULT_COMPANY_ID }
        : { ...formData, CompanyId: DEFAULT_COMPANY_ID };

      await axios.post(`${API_URL}/products/${endpoint}`, payload);
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
      await axios.post(`${API_URL}/products/delete?companyId=${DEFAULT_COMPANY_ID}`, selectedProduct.Id, {
        headers: { 'Content-Type': 'application/json' }
      });
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

        {/* APPBAR */}
        <AppBar position="sticky" elevation={0} sx={{
          background: alpha('#0f172a', 0.8),
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <Toolbar sx={{ justifyContent: 'space-between', height: 72 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{
                bgcolor: 'primary.main',
                width: 44, height: 44, borderRadius: 3,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              }}>
                <InventoryIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ lineHeight: 1.2, fontWeight: 800 }}>SMART WAREHOUSE</Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1 }}>MANAGEMENT SYSTEM</Typography>
              </Box>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Tooltip title="Verileri Yenile">
                <IconButton onClick={fetchData} sx={{ bgcolor: 'rgba(255,255,255,0.03)' }}><RefreshIcon fontSize="small" /></IconButton>
              </Tooltip>
              <Chip label={DEFAULT_COMPANY_ID} size="small" sx={{ bgcolor: alpha('#6366f1', 0.15), color: 'primary.main', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.2)' }} />
            </Stack>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 6 }}>
          {/* PREMIUM ÖZET KARTLARI */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 6 }}>
            {[
              { label: 'Envanter Çeşidi', value: summary.TotalProducts, icon: <InventoryIcon />, color: '#6366f1', desc: 'Tanımlı aktif ürünler' },
              { label: 'Aktivite Kaydı', value: summary.RecentMovementsCount, icon: <HistoryIcon />, color: '#10b981', desc: 'Toplam stok hareketleri' },
              { label: 'Sistem Durumu', value: summary.Status, icon: <StatusIcon />, color: '#f59e0b', desc: 'Operasyonel kararlılık' }
            ].map((item, idx) => (
              <Card key={idx} sx={{
                borderRadius: 4, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(145deg, #1e293b 0%, #111827 100%)',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
                '&:after': {
                  content: '""', position: 'absolute', top: 0, right: 0, width: '40%', height: '100%',
                  background: `radial-gradient(circle at center, ${alpha(item.color, 0.08)} 0%, transparent 70%)`
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box sx={{
                      width: 52, height: 52, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: alpha(item.color, 0.1), color: item.color, border: `1px solid ${alpha(item.color, 0.2)}`
                    }}>
                      {React.cloneElement(item.icon as React.ReactElement<any>, { sx: { fontSize: 28 } })}
                    </Box>
                    <Box>
                      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1 }}>{item.value}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', mt: 0.5, display: 'block' }}>{item.label}</Typography>
                    </Box>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary', mt: 2, display: 'block', opacity: 0.6 }}>{item.desc}</Typography>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* ANA PANEL */}
          <Paper elevation={0} sx={{
            p: 4, borderRadius: 5, background: '#111827',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
          }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ mb: 5 }} justifyContent="space-between" alignItems="center">
              <TextField
                variant="outlined" size="small" placeholder="ID, İsim veya Barkod ile ara..."
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                sx={{
                  width: { xs: '100%', sm: 380 },
                  '& .MuiOutlinedInput-root': { bgcolor: alpha('#000', 0.2), borderRadius: 3, height: 48 }
                }}
                InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1.5, color: 'text.secondary' }} /> }}
              />
              <Button
                variant="contained" startIcon={<AddIcon />}
                onClick={() => { setSelectedProduct(null); setFormData({ Name: '', Barcode: '', Description: '' }); setOpenModal(true); }}
                sx={{ height: 48, px: 4 }}
              >
                Yeni Ürün Tanımla
              </Button>
            </Stack>

            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ '& th': { borderBottom: '2px solid rgba(255,255,255,0.05)', pb: 2, color: 'text.secondary', fontWeight: 700 } }}>
                    <TableCell>REF ID</TableCell>
                    <TableCell>ÜRÜN BİLGİSİ</TableCell>
                    <TableCell>BARKOD</TableCell>
                    <TableCell align="right">İŞLEMLER</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 12 }}><CircularProgress size={32} thickness={5} /></TableCell></TableRow>
                  ) : products.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 12, color: 'text.secondary' }}>Arama kriterlerine uygun ürün bulunamadı.</TableCell></TableRow>
                  ) : (
                    products.map((row) => (
                      <TableRow key={row.Id} hover sx={{ '&:hover': { bgcolor: alpha('#6366f1', 0.04) }, '& td': { borderBottom: '1px solid rgba(255,255,255,0.03)', py: 2.5 } }}>
                        <TableCell sx={{ color: 'text.secondary', fontFamily: 'monospace', fontWeight: 500 }}>#{row.Id}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.Name}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>{row.Description || 'Açıklama belirtilmemiş'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={row.Barcode} size="small" sx={{ borderRadius: 1.5, fontFamily: 'monospace', fontWeight: 600, bgcolor: 'rgba(255,255,255,0.04)' }} />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Stok Hareketi">
                              <IconButton size="small" sx={{ color: 'secondary.main', bgcolor: alpha('#10b981', 0.05) }} onClick={() => handleOpenMovementModal(row)}>
                                <MovementIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Düzenle">
                              <IconButton size="small" sx={{ color: 'primary.main', bgcolor: alpha('#6366f1', 0.05) }} onClick={() => {
                                setSelectedProduct(row);
                                setFormData({ Name: row.Name, Barcode: row.Barcode, Description: row.Description });
                                setOpenModal(true);
                              }}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            <Tooltip title="Arşivle">
                              <IconButton size="small" sx={{ color: 'error.main', bgcolor: alpha('#fb7185', 0.05) }} onClick={() => { setSelectedProduct(row); setOpenDeleteModal(true); }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
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

        {/* STOK MODALI - ENTEGRE SÜREÇLER */}
        <Dialog open={openMovementModal} onClose={() => setOpenMovementModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 5, bgcolor: '#111827', backgroundImage: 'none' } }}>
          <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>Envanter Hareketi</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 4, p: 2.5, bgcolor: alpha('#6366f1', 0.05), borderRadius: 3, border: '1px solid rgba(99, 102, 241, 0.15)' }}>
              <Typography variant="subtitle2" sx={{ color: 'white', fontWeight: 800 }}>{selectedProduct?.Name}</Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">Güncel Depo Durumu:</Typography>
                {stockLoadError ? (
                  <Chip label="Veri Alınamadı" size="small" color="error" />
                ) : currentStock === null ? (
                  <CircularProgress size={14} />
                ) : (
                  <Typography variant="subtitle2" sx={{ color: 'secondary.main', fontWeight: 800 }}>{currentStock} ADET</Typography>
                )}
              </Stack>
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
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 4, pt: 0 }}>
            <Button onClick={() => setOpenMovementModal(false)}>Vazgeç</Button>
            <Button variant="contained" fullWidth onClick={handleSaveMovement} disabled={currentStock === null}>
              İşlemi Onayla ve Kaydet
            </Button>
          </DialogActions>
        </Dialog>

        {/* ÜRÜN MODALI */}
        <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs" PaperProps={{ sx: { borderRadius: 5, bgcolor: '#111827' } }}>
          <DialogTitle sx={{ fontWeight: 800, pt: 3 }}>{selectedProduct ? 'Ürün Bilgilerini Güncelle' : 'Yeni Ürün Kaydı'}</DialogTitle>
          <DialogContent><Stack spacing={3} sx={{ mt: 1 }}>
            <TextField label="Ürün Adı" fullWidth required value={formData.Name} onChange={(e) => setFormData({ ...formData, Name: e.target.value })} />
            <TextField label="Barkod Numarası" fullWidth required value={formData.Barcode} onChange={(e) => setFormData({ ...formData, Barcode: e.target.value })} />
            <TextField label="Ürün Açıklaması" multiline rows={3} fullWidth value={formData.Description} onChange={(e) => setFormData({ ...formData, Description: e.target.value })} />
          </Stack></DialogContent>
          <DialogActions sx={{ p: 4, pt: 0 }}><Button onClick={() => setOpenModal(false)}>İptal</Button><Button variant="contained" onClick={handleSaveProduct}>Kaydet</Button></DialogActions>
        </Dialog>

        <Dialog open={openDeleteModal} onClose={() => setOpenDeleteModal(false)}><DialogTitle sx={{ fontWeight: 800 }}>Arşivleme Onayı</DialogTitle><DialogContent><Typography color="text.secondary">Bu ürünü arşivlemek (soft-delete) istediğinizden emin misiniz? Hareket kayıtları korunacaktır.</Typography></DialogContent><DialogActions sx={{ p: 3 }}><Button onClick={() => setOpenDeleteModal(false)}>Geri Dön</Button><Button color="error" variant="contained" onClick={handleDeleteProduct}>Evet, Arşivle</Button></DialogActions></Dialog>

        <Snackbar open={notification.open} autoHideDuration={4000} onClose={() => setNotification({ ...notification, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}><Alert severity={notification.severity} variant="filled" sx={{ borderRadius: 3, boxShadow: 10 }}>{notification.message}</Alert></Snackbar>
      </Box>
    </ThemeProvider>
  );
}