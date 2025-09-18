// Script pour initialiser le thème avant le rendu React
(function() {
  function getInitialTheme() {
    try {
      // Récupérer le thème depuis localStorage, s'il existe
      const storedTheme = localStorage.getItem('theme');
      
      if (storedTheme && ['light', 'dark', 'bloomberg', 'system'].includes(storedTheme)) {
        return storedTheme;
      }
    } catch (error) {
      console.warn('Error reading theme from localStorage:', error);
    }
    
    // Sinon, utiliser la préférence système
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  function applyTheme(theme) {
    const root = document.documentElement;
    
    // Supprimer toutes les classes de thème
    root.classList.remove('light', 'dark', 'bloomberg-theme');
    
    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      return;
    }
    
    // Appliquer le thème
    if (theme === 'bloomberg') {
      root.classList.add('dark', 'bloomberg-theme');
    } else {
      root.classList.add(theme);
    }
  }
  
  // Appliquer le thème immédiatement pour éviter le flash
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);
  
  // Ajouter cette information au window pour que le React puisse la récupérer
  window.__THEME_INIT__ = initialTheme;
  
  // Écouter les changements de préférences système
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  });
})(); 