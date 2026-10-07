import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  
  // Theme mode options: 'system' | 'light' | 'dark'
  const [themeMode, setThemeMode] = useState('system');

  // Determine if dark mode is active based on user choice or system preference
  const isDark =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const theme = {
    isDark,
    themeMode,
    setThemeMode, // Call setThemeMode('light' | 'dark' | 'system') to update
    colors: {
      background: isDark ? '#121212' : '#F5F4F7',
      card: isDark ? '#1E1E1E' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#1B2A4A',
      subText: isDark ? '#A0A0A0' : '#8A93A6',
      border: isDark ? '#333333' : '#E7EAF3',
      primary: '#8E338A',
    },
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};