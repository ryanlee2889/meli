import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type ColorScheme } from '@/theme/colors';

type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark';

  const colors = isDark ? dark : light;

  return (
    <ThemeContext.Provider value={{ colors, isDark, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeContext must be inside ThemeProvider');
  return ctx;
}
