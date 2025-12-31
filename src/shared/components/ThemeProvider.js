import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { lightTheme, darkTheme } from '../constants/themes';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(lightTheme);

  useEffect(() => {
    // Get initial color scheme
    const initialScheme = Appearance.getColorScheme();
    setTheme(initialScheme === 'dark' ? darkTheme : lightTheme);

    // Listen for changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
    });

    // Cleanup
    return () => subscription?.remove();
  }, []);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};