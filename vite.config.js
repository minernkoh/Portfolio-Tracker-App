import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { secureApiPlugin } from './vite-plugins/secureApiProxy.js'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), secureApiPlugin(env)],
  }
})
