import React, { useEffect, useRef, useState, memo } from 'react';
import { useThemeContext } from '@/hooks/ThemeProvider';

function TradingViewEconomicCalendar() {
  const container = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 550 });
  const { theme } = useThemeContext();

  // Fonction pour obtenir le thème TradingView (light ou dark)
  // TradingView supporte "light", "dark" mais pas "auto"
  const getTradingViewTheme = (): 'light' | 'dark' => {
    // D'abord, vérifier les classes CSS du document (plus fiable)
    const root = document.documentElement;
    if (root.classList.contains('dark') || root.classList.contains('bloomberg-theme')) {
      return 'dark';
    }
    if (root.classList.contains('light')) {
      return 'light';
    }
    
    // Ensuite, utiliser le thème du contexte
    if (theme === 'bloomberg') {
      return 'dark';
    }
    if (theme === 'dark') {
      return 'dark';
    }
    if (theme === 'light') {
      return 'light';
    }
    if (theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    // Fallback
    return 'light';
  };

  // Utiliser une clé pour forcer le rechargement complet du widget
  const tradingViewTheme = getTradingViewTheme();
  const widgetKey = `${tradingViewTheme}-${dimensions.width}-${dimensions.height}`;
  
  // Forcer un re-render quand le thème change en surveillant les classes CSS
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => {
      // Forcer un re-render quand les classes CSS changent
      forceUpdate(prev => prev + 1);
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Écouter aussi les changements de préférences système
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      forceUpdate(prev => prev + 1);
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    
    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleSystemChange);
    };
  }, []);

  // Calculer les dimensions de manière responsive
  useEffect(() => {
    const updateDimensions = () => {
      if (!container.current) return;

      // Obtenir la largeur du conteneur parent (CardContent)
      const parentElement = container.current.closest('[class*="CardContent"]') || 
                            container.current.parentElement;
      
      let availableWidth = 1200; // valeur par défaut
      
      if (parentElement) {
        const rect = parentElement.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(parentElement);
        const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
        const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
        availableWidth = Math.floor(rect.width - paddingLeft - paddingRight);
      } else {
        // Fallback: utiliser la largeur de la fenêtre moins les marges
        const sidebarWidth = 256;
        const padding = 64;
        availableWidth = Math.max(window.innerWidth - sidebarWidth - padding, 600);
      }

      // Limiter la largeur entre 600px et la largeur disponible
      const width = Math.max(Math.min(availableWidth, 1600), 600);
      
      // Hauteur proportionnelle (ratio ~2.2:1 pour le calendrier économique)
      const height = Math.max(Math.floor(width * 0.46), 400);

      setDimensions({ width, height });
    };

    // Calculer au montage avec un léger délai pour s'assurer que le DOM est prêt
    const timeoutId = setTimeout(updateDimensions, 100);

    // Utiliser ResizeObserver pour détecter les changements de taille
    let resizeObserver: ResizeObserver | null = null;
    
    if (container.current && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        updateDimensions();
      });
      
      const elementToObserve = container.current.closest('[class*="CardContent"]') || 
                                container.current.parentElement;
      if (elementToObserve) {
        resizeObserver.observe(elementToObserve);
      }
    }

    // Écouter aussi les changements de taille de fenêtre
    let resizeTimeout: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateDimensions, 150);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(resizeTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Charger/mettre à jour le script TradingView avec les dimensions dynamiques et le thème
  useEffect(() => {
    if (!container.current) return;

    // Nettoyer COMPLÈTEMENT tout le contenu du conteneur
    const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget');
    const allScripts = container.current.querySelectorAll('script[src*="embed-widget-events"]');
    
    // Supprimer tous les scripts existants
    allScripts.forEach(script => {
      script.remove();
    });
    
    // Vider complètement le conteneur du widget
    if (widgetDiv) {
      widgetDiv.innerHTML = '';
    }

    // Attendre que le nettoyage soit terminé avant de créer le nouveau widget
    const timeoutId = setTimeout(() => {
      if (!container.current) return;

      // Créer un nouveau script avec le thème actuel
      // Selon la doc TradingView: colorTheme peut être "light" ou "dark"
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        colorTheme: tradingViewTheme, // "light" ou "dark"
        isTransparent: false,
        locale: "en",
        countryFilter: "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
        importanceFilter: "-1,0,1",
        width: dimensions.width,
        height: dimensions.height
      });
      
      // Ajouter le script uniquement si le conteneur existe toujours
      if (container.current) {
        container.current.appendChild(script);
      }
    }, 100); // Délai plus long pour s'assurer que le nettoyage est complet

    return () => {
      clearTimeout(timeoutId);
      // Cleanup: remove all scripts when component unmounts or changes
      if (container.current) {
        const scripts = container.current.querySelectorAll('script[src*="embed-widget-events"]');
        scripts.forEach(script => script.remove());
      }
    };
  }, [widgetKey, dimensions.width, dimensions.height]); // Utiliser widgetKey qui inclut le thème

  return (
    <div className="tradingview-widget-container w-full max-w-full overflow-hidden" ref={container} key={widgetKey}>
      <div 
        className="tradingview-widget-container__widget" 
        style={{ 
          width: '100%',
          maxWidth: `${dimensions.width}px`,
          minHeight: '400px',
          height: `${dimensions.height}px`,
          margin: '0 auto'
        }}
      ></div>
    </div>
  );
}

export default memo(TradingViewEconomicCalendar);

