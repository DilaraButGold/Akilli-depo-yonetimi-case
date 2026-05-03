import axios from 'axios';
import React, { useState } from 'react';
import {
    Container, Paper, TextField, Button, Typography, Box,
    Alert, CircularProgress, Stack
} from '@mui/material';
import { Inventory as InventoryIcon } from '@mui/icons-material';
import axiosInstance from '../utils/axiosConfig';

// Backend'in döndüğü JSON formatına tam uyumlu interface
interface LoginResponse {
    Token: string;
    Email: string;
    FullName: string;
    Role: string;
    CompanyId: string;
    ExpiresAt: string;
}

interface LoginProps {
    onLogin: (token: string, user: any) => void;
}

const DEMO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export default function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyId, setCompanyId] = useState(DEMO_COMPANY_ID);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Register state'leri
    const [isRegisterMode, setIsRegisterMode] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [registerLoading, setRegisterLoading] = useState(false);
    const [registerSuccess, setRegisterSuccess] = useState('');

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setRegisterSuccess('');

        try {
            // Gönderilen verilerde boşlukları temizle (trim)
            const payload = {
                email: email.trim(),
                password: password, // Şifre trim yapılmaz, boşluk içerebilir
                companyId: companyId.trim()
            };

            console.log('Login isteği gönderiliyor:', payload); // Hata ayıklama

            const response = await axios.post<LoginResponse>(
                'http://localhost:5041/api/auth/login',
                payload,
                {
                    headers: { 'Content-Type': 'application/json' },
                    withCredentials: false // Çerez gönderme, basit istek
                }
            );
            console.log('Doğrudan axios yanıtı:', response);

            console.log('Login yanıtı:', response.data); // Hata ayıklama

            const { Token, FullName, Role, Email, CompanyId } = response.data;

            const userData = {
                fullName: FullName,
                role: Role,
                email: Email,
                companyId: CompanyId
            };

            localStorage.setItem('token', Token);
            localStorage.setItem('user', JSON.stringify(userData));

            onLogin(Token, userData);
        } catch (err: any) {
            console.error('Login hatası detayı:', err);

            // Backend'den dönen hatayı daha esnek yakala
            let message = 'Giriş başarısız! Lütfen bilgilerinizi kontrol edin.';

            if (err.response?.data) {
                // Backend farklı formatlarda hata dönebilir
                const data = err.response.data;
                message = data.Message || data.message || data.error || data.title ||
                    (data.errors ? Object.values(data.errors).flat().join(', ') : message);
            } else if (err.message) {
                message = err.message;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegisterLoading(true);
        setError('');
        setRegisterSuccess('');

        try {
            const payload = {
                email: email.trim(),
                password,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                role: 'WarehouseStaff', // Backend ile birebir aynı
                companyId: companyId.trim()
            };

            console.log('Register isteği gönderiliyor:', payload); // Hata ayıklama

            await axiosInstance.post('/auth/register', payload);

            setRegisterSuccess('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
            setIsRegisterMode(false);
            setPassword('');
            setFirstName('');
            setLastName('');
        } catch (err: any) {
            console.error('Register hatası detayı:', err);

            let message = 'Kayıt başarısız!';
            if (err.response?.data) {
                const data = err.response.data;
                if (data.errors) {
                    // Identity validation hataları
                    const errorMessages = Object.values(data.errors).flat().join(', ');
                    message = errorMessages || message;
                } else {
                    message = data.Message || data.message || data.error || data.title || message;
                }
            }
            setError(message);
        } finally {
            setRegisterLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#0f172a'
        }}>
            <Paper elevation={3} sx={{ p: 5, borderRadius: 4, width: '100%', bgcolor: '#1e293b' }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <InventoryIcon sx={{ fontSize: 48, color: '#818cf8', mb: 2 }} />
                    <Typography variant="h4" component="h1" fontWeight="bold" color="#f1f5f9">
                        Smart Warehouse
                    </Typography>
                    <Typography variant="body2" color="#94a3b8">
                        {isRegisterMode ? 'Yeni Hesap Oluştur' : 'Akıllı Depo Yönetim Sistemi'}
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, bgcolor: '#7f1a1a', color: '#fecaca' }}>
                        {error}
                    </Alert>
                )}

                {registerSuccess && (
                    <Alert severity="success" sx={{ mb: 3, bgcolor: '#14532d', color: '#bbf7d0' }}>
                        {registerSuccess}
                    </Alert>
                )}

                <form onSubmit={isRegisterMode ? handleRegisterSubmit : handleLoginSubmit}>
                    {isRegisterMode && (
                        <>
                            <TextField
                                fullWidth
                                label="Ad"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                margin="normal"
                                required
                                sx={{ input: { color: '#f1f5f9' }, label: { color: '#94a3b8' } }}
                            />
                            <TextField
                                fullWidth
                                label="Soyad"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                margin="normal"
                                required
                                sx={{ input: { color: '#f1f5f9' }, label: { color: '#94a3b8' } }}
                            />
                        </>
                    )}

                    <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        margin="normal"
                        required
                        autoFocus
                        sx={{ input: { color: '#f1f5f9' }, label: { color: '#94a3b8' } }}
                    />

                    <TextField
                        fullWidth
                        label="Şifre"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        margin="normal"
                        required
                        sx={{ input: { color: '#f1f5f9' }, label: { color: '#94a3b8' } }}
                    />

                    <TextField
                        fullWidth
                        label="Şirket ID"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        margin="normal"
                        required
                        helperText={`Demo için: ${DEMO_COMPANY_ID}`}
                        sx={{
                            input: { color: '#f1f5f9' },
                            label: { color: '#94a3b8' },
                            '& .MuiFormHelperText-root': { color: '#64748b' }
                        }}
                    />

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={isRegisterMode ? registerLoading : loading}
                        sx={{ mt: 4, py: 1.5, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}
                    >
                        {isRegisterMode
                            ? (registerLoading ? <CircularProgress size={24} /> : 'Kayıt Ol')
                            : (loading ? <CircularProgress size={24} /> : 'Giriş Yap')
                        }
                    </Button>

                    <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                        <Button
                            onClick={() => {
                                setIsRegisterMode(!isRegisterMode);
                                setError('');
                                setRegisterSuccess('');
                            }}
                            sx={{ color: '#818cf8', textTransform: 'none' }}
                        >
                            {isRegisterMode ? 'Zaten hesabın var mı? Giriş Yap' : 'Hesabın yok mu? Kayıt Ol'}
                        </Button>
                    </Stack>
                </form>
            </Paper>
        </Container>
    );
}