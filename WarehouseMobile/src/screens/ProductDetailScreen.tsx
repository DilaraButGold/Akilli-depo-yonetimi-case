import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Card, ActivityIndicator, SegmentedButtons, Snackbar, List } from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axiosInstance from '../api/axiosConfig';
import { Product, WarehouseZone } from '../types';
import { RootStackParamList } from '../types/navigation';

type ProductDetailScreenRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ProductDetail'>;

export default function ProductDetailScreen() {
    const route = useRoute<ProductDetailScreenRouteProp>();
    const navigation = useNavigation<ProductDetailScreenNavigationProp>();
    const { productId } = route.params;

    const [product, setProduct] = useState<Product | null>(null);
    const [currentStock, setCurrentStock] = useState<number>(0);
    const [zones, setZones] = useState<WarehouseZone[]>([]);
    const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState('1');
    const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

    useEffect(() => {
        fetchProductDetails();
        fetchZones();
    }, [productId]);

    const fetchProductDetails = async () => {
        try {
            const [productRes, stockRes] = await Promise.all([
                axiosInstance.get(`/products/get-by-id/${productId}`),
                axiosInstance.get(`/stockmovements/current-stock/${productId}`)
            ]);

            if (productRes.data) {
                setProduct(productRes.data);
            }
            if (stockRes.data) {
                setCurrentStock(stockRes.data.Stock || 0);
            }
        } catch (error) {
            console.error('Ürün detayları alınamadı:', error);
            Alert.alert('Hata', 'Ürün bilgileri yüklenirken bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const fetchZones = async () => {
        try {
            const res = await axiosInstance.get('/warehousezones/get-all', { params: { pageSize: 500 } });
            if (res.data.Success) {
                setZones(res.data.Data);
                // Varsayılan olarak ilk rafı seç
                if (res.data.Data.length > 0) {
                    setSelectedZoneId(res.data.Data[0].Id);
                }
            }
        } catch (error) {
            console.error('Raf listesi alınamadı:', error);
        }
    };

    const handleSubmit = async () => {
        if (!selectedZoneId) {
            setSnackbar({ visible: true, message: 'Lütfen bir raf seçin.' });
            return;
        }

        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            setSnackbar({ visible: true, message: 'Geçerli bir miktar girin.' });
            return;
        }

        if (movementType === 'OUT' && qty > currentStock) {
            setSnackbar({ visible: true, message: 'Yetersiz stok!' });
            return;
        }

        setSubmitting(true);
        try {
            const res = await axiosInstance.post('/stockmovements/add', {
                ProductId: productId,
                WarehouseZoneId: selectedZoneId,
                Quantity: qty,
                MovementType: movementType,
            });

            if (res.data.Success) {
                setSnackbar({ visible: true, message: 'Stok hareketi başarıyla kaydedildi.' });
                // Stok miktarını güncelle
                fetchProductDetails();
                setQuantity('1');
            } else {
                setSnackbar({ visible: true, message: res.data.Message || 'İşlem başarısız.' });
            }
        } catch (error: any) {
            const message = error.response?.data?.Message || 'Bir hata oluştu.';
            setSnackbar({ visible: true, message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
                <Text>Yükleniyor...</Text>
            </View>
        );
    }

    if (!product) {
        return (
            <View style={styles.centered}>
                <Text>Ürün bulunamadı.</Text>
                <Button onPress={() => navigation.goBack()}>Geri Dön</Button>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="headlineSmall">{product.Name}</Text>
                    <Text variant="bodyMedium" style={styles.barcode}>Barkod: {product.Barcode}</Text>
                    <Text variant="bodySmall" style={styles.description}>{product.Description || 'Açıklama yok'}</Text>

                    <View style={styles.stockContainer}>
                        <Text variant="titleMedium">Mevcut Stok:</Text>
                        <Text variant="displaySmall" style={styles.stockValue}>{currentStock}</Text>
                        <Text variant="bodySmall">adet</Text>
                    </View>
                </Card.Content>
            </Card>

            <Card style={styles.card}>
                <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>Stok Hareketi</Text>

                    <SegmentedButtons
                        value={movementType}
                        onValueChange={(value) => setMovementType(value as 'IN' | 'OUT')}
                        buttons={[
                            { value: 'IN', label: 'Giriş', icon: 'arrow-down' },
                            { value: 'OUT', label: 'Çıkış', icon: 'arrow-up' },
                        ]}
                        style={styles.segmented}
                    />

                    <TextInput
                        label="Miktar"
                        value={quantity}
                        onChangeText={setQuantity}
                        keyboardType="numeric"
                        style={styles.input}
                        mode="outlined"
                    />

                    <Text variant="bodyMedium" style={styles.sectionTitle}>Raf Seçimi</Text>
                    <List.Accordion
                        title={selectedZoneId ? zones.find(z => z.Id === selectedZoneId)?.Name || 'Raf Seçin' : 'Raf Seçin'}
                        style={styles.accordion}
                    >
                        {zones.map((zone) => (
                            <List.Item
                                key={zone.Id}
                                title={zone.Name}
                                description={`Kapasite: ${zone.Capacity}`}
                                onPress={() => setSelectedZoneId(zone.Id)}
                                right={props => selectedZoneId === zone.Id ? <List.Icon {...props} icon="check" /> : null}
                            />
                        ))}
                    </List.Accordion>

                    <Button
                        mode="contained"
                        onPress={handleSubmit}
                        loading={submitting}
                        disabled={submitting}
                        style={styles.submitButton}
                    >
                        İşlemi Kaydet
                    </Button>
                </Card.Content>
            </Card>

            <Snackbar
                visible={snackbar.visible}
                onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
                duration={3000}
            >
                {snackbar.message}
            </Snackbar>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { margin: 16 },
    barcode: { marginTop: 4, color: '#666' },
    description: { marginTop: 8, color: '#888' },
    stockContainer: {
        marginTop: 20,
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#e8eaf6',
        borderRadius: 12,
    },
    stockValue: { fontWeight: 'bold', color: '#3949ab' },
    sectionTitle: { marginVertical: 12, fontWeight: '600' },
    segmented: { marginVertical: 8 },
    input: { marginVertical: 8 },
    accordion: { backgroundColor: '#fff', marginVertical: 8 },
    submitButton: { marginTop: 24, paddingVertical: 6 },
});