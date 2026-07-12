import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // Local dev only: forward /api/* to a `vercel dev` instance running the real
  // serverless functions against the Neon database. Running plain `vite` here
  // (rather than `vercel dev` itself) avoids vercel.json's SPA rewrite
  // (`/((?!api/).*) -> /index.html`) swallowing Vite-internal requests like
  // /@vite/client and /@react-refresh, which aren't real files on disk and so
  // don't survive vercel dev's filesystem-first routing check — that was
  // breaking every module load and left the page blank.
  server: {
    proxy: {
      '/api': 'http://localhost:3210',
    },
  },
})
