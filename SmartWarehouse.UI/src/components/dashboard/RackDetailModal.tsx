import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Box, Stack, Chip } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';

interface RackDetailModalProps {
    open: boolean;
    onClose: () => void;
    rackName: string;
    rackDetails: any[];
}

export default function RackDetailModal({ open, onClose, rackName, rackDetails }: RackDetailModalProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <LocationOnIcon sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6">{rackName} Raf Detayı</Typography>
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
                                            <Chip label={`${item.quantity} adet`} size="small"
                                                color={item.quantity > 40 ? "error" : item.quantity > 20 ? "warning" : "success"} />
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