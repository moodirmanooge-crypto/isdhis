import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pre-bundle the big libraries once, so `npm run dev` doesn't stall/reload on first visit.
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-dom/client', 'react-router-dom', 'framer-motion', 'lucide-react',
      'firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage',
    ],
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Separate long-cached files for the libraries; pages are split by React.lazy.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'firestore';
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'motion';
          if (id.includes('react')) return 'react';
        },
      },
    },
  },
});
