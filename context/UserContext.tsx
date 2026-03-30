import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext<any>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem('@user_session');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Erro ao ler a sessão:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const saveUser = async (userData: any) => {
    setUser(userData);
    if (userData) {
      await AsyncStorage.setItem('@user_session', JSON.stringify(userData));
    }
  };

  // A função de logout agora vive no contexto e limpa do AsyncStorage.
  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('@user_session');
  };

  return (
    <UserContext.Provider value={{ user, setUser, saveUser, logout, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
