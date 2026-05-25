import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfPayments',
      filename: 'remoteEntry.js',
      exposes: { './Invoices': './src/pages/Invoices' },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true },
        '@tanstack/react-query': { singleton: true },
        axios: { singleton: true },
      },
    }),
  ],
  server: { port: 5177 },
  build: { target: 'esnext' },
});
