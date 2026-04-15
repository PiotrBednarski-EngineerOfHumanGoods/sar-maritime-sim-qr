import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: set GITHUB_PAGES=true in CI (see .github/workflows/pages.yml)
const base = process.env.GITHUB_PAGES === 'true' ? '/sar-maritime-sim-qr/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})
