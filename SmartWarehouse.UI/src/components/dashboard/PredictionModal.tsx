import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface PredictionModalProps {
    open: boolean;
    onClose: () => void;
    predictions: any[];
}

export default function PredictionModal({ open, onClose, predictions }: PredictionModalProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberIcon color="warning" /> Kritik Stok Uyarıları (Tahmini)
            </DialogTitle>
            <DialogContent dividers>
                {predictions.length === 0 ? (
                    <Typography color="text.secondary">Şu anda kritik seviyede ürün bulunmuyor.</Typography>
                ) : (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Ürün ID</TableCell>
                                    <TableCell>Günlük Ort. Çıkış</TableCell>
                                    <TableCell>Mevcut Stok</TableCell>
                                    <TableCell>Tahmini Süre (Gün)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {predictions.map((p) => (
                                    <TableRow key={p.productId}>
                                        <TableCell>{p.productId}</TableCell>
                                        <TableCell>{p.avgDailyOut}</TableCell>
                                        <TableCell>{p.currentStock}</TableCell>
                                        <TableCell sx={{ color: p.estimatedDaysLeft <= 3 ? 'error.main' : 'text.primary', fontWeight: 'bold' }}>
                                            {p.estimatedDaysLeft}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Kapat</Button>
            </DialogActions>
        </Dialog>
    );
} 