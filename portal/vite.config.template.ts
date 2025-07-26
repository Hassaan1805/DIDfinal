import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Standard Vite configuration for Decentralized Trust Platform
// This prevents CORS issues and ensures proper API communication

export default defineConfig({
  plugins: [react()],
  
  // Development server configuration
  server: {
    // Standard port for React portal
    port: 5174,
    
    // Enable HMR
    hmr: true,
    
    // Proxy configuration to prevent CORS issues
    proxy: {
      // Proxy all /api requests to backend server
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying if needed
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  },
  
  // Build configuration
  build: {
    // Output directory
    outDir: 'dist',
    
    // Generate source maps for debugging
    sourcemap: true,
    
    // Rollup options
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          qrcode: ['qrcode']
        }
      }
    }
  },
  
  // Environment variables
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  
  // Resolve configuration
  resolve: {
    alias: {
      '@': '/src',
      '@shared': '../shared/src'
    }
  }
})
