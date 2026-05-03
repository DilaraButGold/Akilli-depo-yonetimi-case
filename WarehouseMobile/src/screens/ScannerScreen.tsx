import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, ActivityIndicator, Button } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axiosInstance from '../api/axiosConfig';
import { Product } from '../types';
import { RootStackParamList } from '../types/navigation';

type ScannerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Scanner'>;

export default function ScannerScreen() {
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigation = useNavigation<ScannerScreenNavigationProp>();

    const [permission, requestPermission] = useCameraPermissions();

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (scanned) return;
        setScanned(true);
        setLoading(true);

        try {
            console.log('📷 Okunan barkod:', data);
            const response = await axiosInstance.get('/products/get-all', {
                params: { searchTerm: data, page: 1, pageSize: 1 }
            });

            if (response.data.Success && response.data.Data.length > 0) {
                const product: Product = response.data.Data[0];
                navigation.replace('ProductDetail', { productId: product.Id });
            } else {
                Alert.alert('Ürün Bulunamadı', `${data} barkoduna ait ürün kayıtlı değil.`);
                setScanned(false);
            }
        } catch (error) {
            console.error('Ürün sorgulama hatası:', error);
            Alert.alert('Hata', 'Ürün bilgileri alınırken bir hata oluştu.');
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    if (!permission) {
        return <View style={styles.centered}><ActivityIndicator /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.centered}>
                <Text>Kamera izni gerekiyor</Text>
                <Button onPress={requestPermission}>İzin Ver</Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'pdf417'],
                }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            />

            {/* Görsel tarama alanı (önceki ile aynı) */}
            <View style={styles.overlay}>
                <View style={styles.scanArea}>
                    <View style={styles.cornerTopLeft} />
                    <View style={styles.cornerTopRight} />
                    <View style={styles.cornerBottomLeft} />
                    <View style={styles.cornerBottomRight} />
                </View>
                <Text style={styles.scanText}>
                    {loading ? 'Aranıyor...' : 'Barkodu kameraya gösterin'}
                </Text>
                {loading && <ActivityIndicator size="large" color="#ffffff" style={styles.loader} />}
                <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.cancelButton}
                    textColor="#ffffff"
                >
                    İptal
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    scanArea: {
        width: 250,
        height: 250,
        borderWidth: 0,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    cornerTopLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#6366f1',
    },
    cornerTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 40,
        height: 40,
        borderTopWidth: 4,
        borderRightWidth: 4,
        borderColor: '#6366f1',
    },
    cornerBottomLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderLeftWidth: 4,
        borderColor: '#6366f1',
    },
    cornerBottomRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 40,
        height: 40,
        borderBottomWidth: 4,
        borderRightWidth: 4,
        borderColor: '#6366f1',
    },
    scanText: {
        color: '#ffffff',
        fontSize: 16,
        marginTop: 20,
        fontWeight: '500',
    },
    loader: { marginTop: 20 },
    cancelButton: {
        marginTop: 30,
        borderColor: '#ffffff',
    },
});