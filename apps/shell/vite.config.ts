import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'shell',
      // ── Remote microfrontends ──────────────────────────────────────────
      remotes: {
        mfAuth:       `${process.env.VITE_MF_AUTH_URL ?? 'http://localhost:5174'}/assets/remoteEntry.js`,
        mfScheduling: `${process.env.VITE_MF_SCHEDULING_URL ?? 'http://localhost:5175'}/assets/remoteEntry.js`,
        mfClinical:   `${process.env.VITE_MF_CLINICAL_URL ?? 'http://localhost:5176'}/assets/remoteEntry.js`,
        mfPayments:   `${process.env.VITE_MF_PAYMENTS_URL ?? 'http://localhost:5177'}/assets/remoteEntry.js`,
        mfReports:    `${process.env.VITE_MF_REPORTS_URL ?? 'http://localhost:5178'}/assets/remoteEntry.js`,
      },
      // ── Shared libraries (single instance) ────────────────────────────
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.1' },
        'react-dom': { singleton: true, requiredVersion: '^18.3.1' },
        'react-router-dom': { singleton: true, requiredVersion: '^6.24.0' },
        zustand: { singleton: true, requiredVersion: '^4.5.4' },
        axios: { singleton: true, requiredVersion: '^1.7.2' },
      },
    }),
  ],
  server: { port: 5173 },
  build: { target: 'esnext' },
});
