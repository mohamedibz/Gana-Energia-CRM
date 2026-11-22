import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Puerto fijo: el backend solo permite por defecto el origen http://localhost:5173 (CORS)
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
