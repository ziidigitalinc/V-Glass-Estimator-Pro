import path from 'path';
import { defineConfig }  from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // ... other config (plugins, build, etc.)
  server: {
    allowedHosts: true
  }
})
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
