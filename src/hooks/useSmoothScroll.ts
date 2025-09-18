import { useEffect, useCallback } from 'react';

interface SmoothScrollOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export const useSmoothScroll = () => {
  const scrollToElement = useCallback((
    elementId: string, 
    options: SmoothScrollOptions = {}
  ) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
        ...options
      });
    }
  }, []);

  const scrollToTop = useCallback((options: SmoothScrollOptions = {}) => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
      ...options
    });
  }, []);

  const scrollToBottom = useCallback((options: SmoothScrollOptions = {}) => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
      ...options
    });
  }, []);

  const scrollToPosition = useCallback((
    x: number, 
    y: number, 
    options: SmoothScrollOptions = {}
  ) => {
    window.scrollTo({
      left: x,
      top: y,
      behavior: 'smooth',
      ...options
    });
  }, []);

  // Appliquer le scroll fluide global
  useEffect(() => {
    // Ajouter le comportement de scroll fluide au document
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Nettoyer à la fin
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return {
    scrollToElement,
    scrollToTop,
    scrollToBottom,
    scrollToPosition
  };
};

// Hook pour gérer le scroll avec momentum sur mobile
export const useMomentumScroll = () => {
  useEffect(() => {
    // Ajouter le support du momentum scroll sur iOS
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-overflow-scrolling: touch;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);
};

// Hook pour gérer le scroll avec des animations personnalisées
export const useAnimatedScroll = () => {
  const scrollWithAnimation = useCallback((
    element: HTMLElement,
    targetY: number,
    duration: number = 300
  ) => {
    const startY = element.scrollTop;
    const distance = targetY - startY;
    const startTime = performance.now();

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Fonction d'easing (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      element.scrollTop = startY + (distance * easeOut);
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  }, []);

  return { scrollWithAnimation };
};
