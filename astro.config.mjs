// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Base do GitHub Pages vem do ambiente (ex.: SITE_BASE=/pixel-focus); padrão: raiz.
// SITE_URL (opcional) dá a URL absoluta usada nas meta tags OG/Twitter.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.SITE_BASE || '/',
  // Os dados gerados pelos scripts (compare/, deblur/, refocus/, teaser/) ficam em static/.
  publicDir: './static',
  trailingSlash: 'ignore',
  // Inglês na raiz (/) e português em /pt/; textos em src/lib/i18n.ts.
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'pt'],
    routing: { prefixDefaultLocale: false },
  },
  // A compressão do Astro remove o espaço entre tags inline e quebras de linha ("em<a>").
  compressHTML: false,
  vite: {
    plugins: [tailwindcss()],
  },
});
