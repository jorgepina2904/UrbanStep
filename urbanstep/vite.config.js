import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.js'],
    include: ['src/**/*.test.js'],
    // Supabase simulado: las pruebas nunca tocan la nube real
    env: {
      VITE_SUPABASE_URL: 'https://pruebas.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'clave-de-pruebas-clave-de-pruebas'
    }
  },
})
