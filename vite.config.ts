import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { wasp } from 'wasp/client/vite'

// Custom dev ports to avoid conflict with domovina-rag-infra-mcp-1 (Docker)
// which binds host port 3000. Server uses PORT=4001 (see .env.server),
// client uses 4000 here.
export default defineConfig({
  plugins: [wasp(), tailwindcss()],
  server: {
    open: false,
    port: 4000,
    strictPort: true,
  },
})
