import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfReports',
      filename: 'remoteEntry.js',
      exposes: { './Dashboard': './src/pages/Dashboard' },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true },
        '@tanstack/react-query': { singleton: true },
        axios: { singleton: true },
      },
    }),
  ],
  server: { port: 5178 },
  build: { target: 'esnext' },
});
