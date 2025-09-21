import { useEffect } from 'react';

export const useZoom = () => {
  useEffect(() => {
    // Load zoom level from localStorage on app start
    const savedZoom = localStorage.getItem('fx-hedging-zoom');
    if (savedZoom) {
      const zoomLevel = parseInt(savedZoom);
      if (zoomLevel >= 50 && zoomLevel <= 150) {
        document.documentElement.style.zoom = `${zoomLevel}%`;
        // Apply sidebar-specific zoom adjustments
        applySidebarZoom(zoomLevel);
      }
    }
  }, []);

  const applyZoom = (zoomLevel: number) => {
    document.documentElement.style.zoom = `${zoomLevel}%`;
    localStorage.setItem('fx-hedging-zoom', zoomLevel.toString());
    // Apply sidebar-specific zoom adjustments
    applySidebarZoom(zoomLevel);
  };

  const applySidebarZoom = (zoomLevel: number) => {
    // Set CSS custom property for sidebar zoom factor
    const zoomFactor = zoomLevel / 100;
    document.documentElement.style.setProperty('--sidebar-zoom-factor', zoomFactor.toString());
    
    // Adjust sidebar width based on zoom level
    const sidebar = document.querySelector('.sidebar-zoom-adaptive') as HTMLElement;
    if (sidebar) {
      const baseWidth = 16; // 16rem base width
      const adjustedWidth = baseWidth * zoomFactor;
      sidebar.style.width = `${adjustedWidth}rem`;
      sidebar.style.minWidth = `${adjustedWidth}rem`;
      sidebar.style.maxWidth = `${adjustedWidth}rem`;
    }
  };

  const getCurrentZoom = (): number => {
    const savedZoom = localStorage.getItem('fx-hedging-zoom');
    return savedZoom ? parseInt(savedZoom) : 100;
  };

  return {
    applyZoom,
    getCurrentZoom
  };
};
