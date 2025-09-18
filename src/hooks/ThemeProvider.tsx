import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme, Theme } from './useTheme';

// Créer un contexte pour le thème
interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Hook pour utiliser le contexte de thème
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};

// Provider qui expose le thème à tous les composants enfants
interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const themeState = useTheme();

  // S'assurer que le thème est appliqué au niveau racine
  React.useEffect(() => {
    const root = document.documentElement;
    const currentTheme = themeState.theme;
    
    // Supprimer toutes les classes de thème
    root.classList.remove("light", "dark", "bloomberg-theme");
    
    // Appliquer le thème actuel
    if (currentTheme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.add(systemTheme);
    } else if (currentTheme === "bloomberg") {
      root.classList.add("dark", "bloomberg-theme");
    } else {
      root.classList.add(currentTheme);
    }
  }, [themeState.theme]);

  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
}; 