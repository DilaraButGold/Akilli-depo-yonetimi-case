import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text, Appbar } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

// 📌 Navigasyon parametre tiplerini tanımla
type RootStackParamList = {
    Home: undefined;
    Scanner: undefined;
    ProductDetail: { productId?: number } | undefined;
};

// 📌 Bu ekrana özel navigation tipi
type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
    const { user, signOut } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();

    return (
        <View style={styles.container}>
            <Appbar.Header>
                <Appbar.Content title={`Hoş geldin, ${user?.fullName}`} />
                <Appbar.Action icon="logout" onPress={signOut} />
            </Appbar.Header>
            <View style={styles.content}>
                <Text variant="titleMedium" style={styles.role}>
                    Rol: {user?.role}
                </Text>
                <Button
                    mode="contained"
                    icon="barcode-scan"
                    onPress={() => navigation.navigate('Scanner')}
                    style={styles.button}
                >
                    Barkod Tara
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
    role: { marginBottom: 20 },
    button: { width: '100%', paddingVertical: 8 },
});