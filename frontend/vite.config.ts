import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const inDocker = !!process.env.API_PROXY_TARGET;

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5080' },
    watch: { usePolling: inDocker },
  },
});
