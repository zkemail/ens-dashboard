import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Fallback to index.html for client-side routing in dev
    historyApiFallback: true,
  },
  preview: {
    // Also for preview mode
    historyApiFallback: true,
  },
})
