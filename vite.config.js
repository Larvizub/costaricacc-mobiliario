import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false // Desactivar overlay de errores para evitar conflictos
    },
    fs: {
      // Permitir acceso a archivos fuera del root si es necesario
      allow: ['.']
    },
    // Agregar configuración para manejar mejor las dependencias
    watch: {
      usePolling: true,
      interval: 300
    },
    // Forzar refresh del cache
    force: true,
    // Preload de módulos problemáticos
    preTransformRequests: false
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "use client" warnings from MUI
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE' && warning.message.includes('use client')) {
          return
        }
        warn(warning)
      },
      output: {
        // Mejorar el chunking para módulos dinámicos
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          firebase: ['firebase/app', 'firebase/database', 'firebase/auth'],
          utils: ['xlsx', 'react-signature-canvas', 'emailjs-com']
        }
      }
    }
  },
  optimizeDeps: {
    // Forzar la inclusión de dependencias problemáticas
    include: [
      'xlsx',
      '@mui/material',
      '@mui/icons-material',
      'firebase/app',
      'firebase/database',
      'firebase/auth',
      'react-signature-canvas',
      'emailjs-com'
    ],
    // Excluir dependencias que causan problemas
    exclude: [],
    // Forzar refresh del cache
    force: true
  }
})