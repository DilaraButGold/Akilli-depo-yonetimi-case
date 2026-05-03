import React, { createContext, useState, useContext, useEffect } from 'react';
import { getData, storeData, removeData } from '../utils/storage';
import { User } from '../types';

interface AuthContextData {
    user: User | null;
    isLoading: boolean;
    signIn: (token: string, user: User) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadStorageData();
    }, []);

    async function loadStorageData() {
        try {
            const token = await getData('token');
            const userData = await getData('user');
            if (token && userData) {
                setUser(userData);
            }
        } catch (error) {
            console.error('Auth verileri yüklenemedi:', error);
        } finally {
            setIsLoading(false);
        }
    }

    const signIn = async (token: string, user: User) => {
        await storeData('token', token);
        await storeData('user', user);
        setUser(user);
    };

    const signOut = async () => {
        await removeData('token');
        await removeData('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export function useAuth() {
    return useContext(AuthContext);
}