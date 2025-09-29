import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8070,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimisations pour la production
    target: 'esnext',
    minify: 'terser',
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Séparer les chunks pour optimiser le chargement
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor'
            }
            if (id.includes('@supabase')) {
              return 'supabase'
            }
            if (id.includes('@radix-ui')) {
              return 'ui'
            }
            if (id.includes('recharts')) {
              return 'charts'
            }
            if (id.includes('date-fns')) {
              return 'utils'
            }
          }
        },
        // Optimiser les noms de fichiers
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    // Optimisations de performance
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production'
      }
    },
    // Limite de taille des chunks
    chunkSizeWarningLimit: 1000
  },
  // Optimisations de développement
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      'date-fns'
    ]
  },
  // Configuration des variables d'environnement
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}));
