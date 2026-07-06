import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export const themeColorsLight = {
  background: '#FAF9F6',
  card: '#ffffff',
  text: '#0f172a',
  subtext: '#64748b',
  border: '#f1f5f9',
  primary: '#7A1A1A',
  badgeBg: '#f1f5f9',
  statusBar: 'dark-content' as const,
};

export const themeColorsDark = {
  background: '#0f172a',
  card: '#1e293b',
  text: '#f8fafc',
  subtext: '#94a3b8',
  border: '#334155',
  primary: '#f43f5e',
  badgeBg: '#334155',
  statusBar: 'light-content' as const,
};

type ThemeColors = {
  background: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  primary: string;
  badgeBg: string;
  statusBar: 'dark-content' | 'light-content';
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType>({
  isDarkMode: false,
  toggleTheme: () => {},
  colors: themeColorsLight,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const stored = await AsyncStorage.getItem('@theme_dark');
        if (stored !== null) {
          setIsDarkMode(stored === 'true');
        }
      } catch (error) {
        console.error('Erro ao ler tema:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    await AsyncStorage.setItem('@theme_dark', String(nextVal));
  };

  const colors = isDarkMode ? themeColorsDark : themeColorsLight;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
