import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'mfAuth',
      filename: 'remoteEntry.js',
      exposes: {
        './Login': './src/pages/Login',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true },
        'react-router-dom': { singleton: true },
        zustand: { singleton: true },
        axios: { singleton: true },
      },
    }),
  ],
  server: { port: 5174 },
  build: { target: 'esnext' },
});
