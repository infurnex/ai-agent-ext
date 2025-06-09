import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/content.ts'),
        background: resolve(__dirname, 'src/background.ts'),
        popup: resolve(__dirname, 'src/popup/popup.tsx'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'content') return 'src/content/[name].js';
          if (chunkInfo.name === 'background') return 'src/[name].js';
          if (chunkInfo.name === 'popup') return 'src/popup/[name].js';
          return '[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            if (assetInfo.name.includes('popup')) {
              return 'src/popup/[name][extname]';
            }
            return 'src/content/[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});