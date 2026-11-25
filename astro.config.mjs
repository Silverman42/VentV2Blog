// @ts-check
import { defineConfig, envField } from 'astro/config';

import netlify from '@astrojs/netlify';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://vent.africa',
  // Prerendered pages go to Netlify's CDN; on-demand pages and /_actions/* run as a Netlify Function.
  adapter: netlify(),
  env: {
    schema: {
      BLOG_API_BASE_URL: envField.string({ context: 'server', access: 'secret', url: true }),
      BLOG_API_APP_VERSION: envField.string({ context: 'server', access: 'public', default: '1.0.0' }),
      BLOG_API_DEVICE_OS: envField.enum({
        context: 'server',
        access: 'public',
        values: ['web', 'android', 'ios'],
        default: 'web',
      }),
    },
  },
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
