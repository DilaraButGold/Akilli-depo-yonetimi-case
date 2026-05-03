import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Snackbar, ActivityIndicator } from 'react-native-paper';
import axiosInstance from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { LoginResponse } from '../types';

const DEMO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyId, setCompanyId] = useState(DEMO_COMPANY_ID);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [visible, setVisible] = useState(false);

    const { signIn } = useAuth();

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await axiosInstance.post<LoginResponse>('/auth/login', {
                email: email.trim(),
                password,
                companyId: companyId.trim(),
            });

            const { Token, FullName, Role, Email, CompanyId } = response.data;
            await signIn(Token, { fullName: FullName, role: Role, email: Email, companyId: CompanyId });
        } catch (err: any) {
            const message = err.response?.data?.Message || 'Giriş başarısız!';
            setError(message);
            setVisible(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text variant="headlineMedium" style={styles.title}>Depo Yönetimi</Text>
            <TextInput label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" style={styles.input} />
            <TextInput label="Şifre" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
            <TextInput label="Şirket ID" value={companyId} onChangeText={setCompanyId} style={styles.input} />
            <Button mode="contained" onPress={handleLogin} loading={loading} disabled={loading} style={styles.button}>
                Giriş Yap
            </Button>
            <Snackbar visible={visible} onDismiss={() => setVisible(false)} duration={3000}>{error}</Snackbar>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f5f5f5' },
    title: { textAlign: 'center', marginBottom: 30, fontWeight: 'bold' },
    input: { marginBottom: 15 },
    button: { marginTop: 10, paddingVertical: 6 },
});