// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://vent.africa',
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Astro sets build.target to "esnext", which Lightning CSS also uses when minifying CSS.
      // With "esnext" it merges -webkit-backdrop-filter and backdrop-filter into one
      // declaration, so the frosted glass breaks in production. Use real browser targets.
      cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'],
    },
  },
});
