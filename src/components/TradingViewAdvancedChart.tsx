import React, { useEffect, useRef, useState, memo } from 'react';
import { useThemeContext } from '@/hooks/ThemeProvider';

interface TradingViewAdvancedChartProps {
  symbol?: string;
  interval?: string;
  height?: number;
}

function TradingViewAdvancedChart({ 
  symbol = "NASDAQ:AAPL", 
  interval = "D",
  height = 600 
}: TradingViewAdvancedChartProps) {
  const container = useRef<HTMLDivElement>(null);
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
  const widgetKey = `${tradingViewTheme}-${symbol}-${interval}-${height}`;
  
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

  // Charger/mettre à jour le script TradingView avec le thème dynamique
  useEffect(() => {
    if (!container.current) return;

    // Nettoyer COMPLÈTEMENT tout le contenu du conteneur
    const widgetDiv = container.current.querySelector('.tradingview-widget-container__widget');
    const allScripts = container.current.querySelectorAll('script[src*="embed-widget-advanced-chart"]');
    
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
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        autosize: true,
        symbol: symbol,
        interval: interval,
        timezone: "exchange",
        theme: tradingViewTheme, // "light" ou "dark"
        style: "0",
        locale: "en",
        allow_symbol_change: true,
        calendar: false,
        withdateranges: true,
        save_image: false,
        details: true,
        hotlist: true,
        support_host: "https://www.tradingview.com"
      });
      
      // Ajouter le script uniquement si le conteneur existe toujours
      if (container.current) {
        container.current.appendChild(script);
      }
    }, 100); // Délai pour s'assurer que le nettoyage est complet

    return () => {
      clearTimeout(timeoutId);
      // Cleanup: remove all scripts when component unmounts or changes
      if (container.current) {
        const scripts = container.current.querySelectorAll('script[src*="embed-widget-advanced-chart"]');
        scripts.forEach(script => script.remove());
      }
    };
  }, [widgetKey, symbol, interval, height]); // Utiliser widgetKey qui inclut le thème

  return (
    <div 
      className="tradingview-widget-container w-full max-w-full overflow-hidden" 
      ref={container} 
      key={widgetKey}
      style={{ height: "100%", width: "100%" }}
    >
      <div 
        className="tradingview-widget-container__widget" 
        style={{ 
          height: `${height}px`, 
          width: "100%",
          minHeight: '400px'
        }}
      ></div>
    </div>
  );
}

export default memo(TradingViewAdvancedChart);

