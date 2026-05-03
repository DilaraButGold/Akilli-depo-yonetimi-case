import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box,
    Stack, Paper, Tooltip, FormControl, InputLabel, Select, MenuItem, TextField,
    CircularProgress, LinearProgress, alpha
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { MAIN_ZONES, AISLES_PER_ZONE, SHELVES_PER_AISLE } from '../../constants/warehouseConstants';

interface StockMovementModalProps {
    open: boolean;
    onClose: () => void;
    selectedProduct: any;
    zones: any[];
    zoneOccupancy: Record<string, { stock: number; capacity: number }>;
    selectedMainZone: string;
    setSelectedMainZone: (zone: string) => void;
    selectedLocation: string;
    setSelectedLocation: (loc: string) => void;
    handleRackClick: (zoneId: number, rackName: string) => void;
    movementData: { Quantity: number; MovementType: string };
    setMovementData: (data: any) => void;
    currentStock: number | null;
    handleSaveMovement: () => void;
    rackStocks: Record<number, number>;
    axiosInstance: any;
}

export default function StockMovementModal({
    open, onClose, selectedProduct, zones, zoneOccupancy,
    selectedMainZone, setSelectedMainZone, selectedLocation,
    setSelectedLocation, handleRackClick, movementData,
    setMovementData, currentStock, handleSaveMovement, rackStocks,
    axiosInstance
}: StockMovementModalProps) {

    const handleRackPress = async (locStr: string) => {
        setSelectedLocation(locStr);
        let currentZone = zones.find(z => z.Name === locStr);
        let zoneId = currentZone?.Id;

        if (!zoneId) {
            try {
                const createRes = await axiosInstance.post(`/warehousezones/create`, {
                    Name: locStr,
                    Description: `${selectedMainZone} Bölgesi, Fiziksel Raf Konumu`,
                    Capacity: 50
                });
                zoneId = createRes.data.Id;
            } catch (e) {
                console.error('Raf oluşturulamadı', e);
                return;
            }
        }

        if (zoneId) {
            handleRackClick(zoneId, locStr);
        }
    };

    // 🆕 Tüm bölgelerin toplam stoğunu hesapla
    const totalAllZonesStock = Object.values(zoneOccupancy).reduce((sum, z) => sum + (z?.stock ?? 0), 0);

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
            PaperProps={{ sx: { borderRadius: 5, bgcolor: '#111827', backgroundImage: 'none', border: '1px solid rgba(255,255,255,0.05)' } }}>
            <DialogTitle sx={{ fontWeight: 800, pt: 3, borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={2}>
                    <LocationOnIcon sx={{ color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h6">Görsel Depo Haritası</Typography>
                        <Typography variant="caption" color="text.secondary">Ürün: {selectedProduct?.Name}</Typography>
                    </Box>
                </Stack>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
                <Stack direction={{ xs: 'column', md: 'row' }}>
                    {/* SOL TARAF */}
                    <Box sx={{ flex: 2, p: 3, borderRight: { md: '1px solid rgba(255,255,255,0.05)' } }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                            1. Ana Bölge Seçimi
                        </Typography>
                        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 4 }}>
                            {MAIN_ZONES.map(z => {
                                const zoneInfo = zoneOccupancy[z];
                                const stockCount = zoneInfo?.stock ?? 0;
                                const capacityCount = zoneInfo?.capacity ?? 1400;
                                const percentValue = Math.round((stockCount / capacityCount) * 100);
                                const isSelected = selectedMainZone === z;
                                const isFull = stockCount >= capacityCount;
                                const isLowStock = stockCount < 50;
                                let bgColor = 'rgba(255,255,255,0.02)';
                                if (isSelected) bgColor = alpha('#6366f1', 0.15);
                                else if (isFull) bgColor = alpha('#ef4444', 0.2);
                                else if (isLowStock) bgColor = alpha('#f59e0b', 0.2);
                                else if (percentValue > 70) bgColor = alpha('#fbbf24', 0.1);
                                return (
                                    <Paper key={z} onClick={() => setSelectedMainZone(z)}
                                        sx={{ p: 1.5, cursor: 'pointer', transition: 'all 0.2s', bgcolor: bgColor, border: `1px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.05)'}`, '&:hover': { bgcolor: alpha('#6366f1', 0.1) } }}>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                                            <Typography variant="h6" sx={{ color: isSelected ? 'primary.main' : 'text.primary' }}>{z}</Typography>
                                            <Typography variant="caption" sx={{ color: isFull ? 'error.main' : 'text.secondary', fontWeight: 600 }}>{stockCount} / {capacityCount}</Typography>
                                        </Stack>
                                        <LinearProgress variant="determinate" value={percentValue}
                                            color={isFull ? "error" : isLowStock ? "warning" : isSelected ? "primary" : "inherit"}
                                            sx={{ height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)' }} />
                                    </Paper>
                                );
                            })}
                        </Box>

                        <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                            2. Koridor ve Raf Haritası ( {selectedMainZone} Bölgesi )
                        </Typography>
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
                                                const isSelectedLoc = selectedLocation === locStr;
                                                const currentZone = zones.find(z => z.Name === locStr);
                                                const zoneId = currentZone?.Id || 0;
                                                const rackStock = rackStocks[zoneId] || 0;
                                                const hasStock = rackStock > 0;

                                                return (
                                                    <Tooltip key={shelfNum} title={`${locStr} (${hasStock ? rackStock + ' adet stok' : 'Boş'})`}>
                                                        <Box
                                                            onClick={() => handleRackPress(locStr)}
                                                            sx={{
                                                                flex: 1, height: 36, borderRadius: 1.5, display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                bgcolor: isSelectedLoc ? 'secondary.main' : (hasStock ? alpha('#10b981', 0.4) : 'rgba(255,255,255,0.05)'),
                                                                color: isSelectedLoc ? '#000' : 'text.secondary',
                                                                fontWeight: isSelectedLoc ? 800 : 500,
                                                                border: `1px solid ${isSelectedLoc ? '#10b981' : (hasStock ? alpha('#10b981', 0.6) : 'rgba(255,255,255,0.05)')}`,
                                                                '&:hover': { bgcolor: isSelectedLoc ? 'secondary.main' : alpha('#10b981', 0.2) }
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

                    {/* SAĞ TARAF */}
                    <Box sx={{ flex: 1, p: 3, bgcolor: 'rgba(0,0,0,0.1)' }}>
                        <Box sx={{ mb: 4, p: 2.5, bgcolor: alpha('#10b981', 0.1), borderRadius: 3, border: '1px dashed rgba(16, 185, 129, 0.4)' }}>
                            <Typography variant="caption" color="text.secondary" display="block">Hedef Lokasyon</Typography>
                            <Typography variant="h5" sx={{ color: 'secondary.main', fontWeight: 800, letterSpacing: 1 }}>{selectedLocation}</Typography>
                        </Box>
                        <Stack spacing={3}>
                            <FormControl fullWidth>
                                <InputLabel>İşlem Türü</InputLabel>
                                <Select label="İşlem Türü" value={movementData.MovementType}
                                    onChange={(e) => setMovementData({ ...movementData, MovementType: e.target.value as string })}>
                                    <MenuItem value="IN">Stok Girişi (Mal Kabul)</MenuItem>
                                    <MenuItem value="OUT">Stok Çıkışı (Sevkiyat)</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField label="Miktar" type="number" fullWidth value={movementData.Quantity}
                                onChange={(e) => setMovementData({ ...movementData, Quantity: Math.max(1, parseInt(e.target.value) || 0) })} />

                            {/* Bölge Toplam Stok */}
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    {selectedMainZone} Bölgesi Toplam Stok
                                </Typography>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {zoneOccupancy[selectedMainZone]?.stock ?? 0} ADET
                                </Typography>
                            </Box>

                            {/* 🆕 Depo Genel Stok */}
                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.02)' }}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                    Depo Genel Stok
                                </Typography>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {totalAllZonesStock} ADET
                                </Typography>
                            </Box>

                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Vazgeç</Button>
                <Button variant="contained" onClick={handleSaveMovement} sx={{ px: 4 }}>Tamamla</Button>
            </DialogActions>
        </Dialog>
    );
}