import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import { SITE_URL } from './src/lib/site';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile'
  }),
  site: SITE_URL,
  trailingSlash: 'never',
  compressHTML: true,

  /* Alias routes.
     These cover the URL shapes people arrive with from competitors and from
     older links. Each is a 301 to the canonical page so the link equity lands
     on one URL instead of being split across near-duplicates. */
  redirects: {
    '/can-i-run': { status: 301, destination: '/can-it-run' },
    '/can-i-run-it': { status: 301, destination: '/can-it-run' },
    '/tier-list-gpu': { status: 301, destination: '/gpu-tier-list' },
    '/tier-list-cpu': { status: 301, destination: '/cpu-tier-list' },
    '/gpu-tier-list-2026': { status: 301, destination: '/gpu-tier-list' },
    '/build': { status: 301, destination: '/build-suggest' },
    '/build-generator': { status: 301, destination: '/build-suggest' },
    '/fps-calculator': { status: 301, destination: '/fps-estimator' },
    '/bottleneck-calculator': { status: 301, destination: '/bottleneck' },
    '/privacy-policy': { status: 301, destination: '/privacy' },
    '/cookie-policy': { status: 301, destination: '/privacy' },
    '/terms-of-service': { status: 301, destination: '/terms' },
    '/game': { status: 301, destination: '/games' },
    '/gpu': { status: 301, destination: '/gpus' },
    '/cpu': { status: 301, destination: '/cpus' },
    '/best-picks': { status: 301, destination: '/game-lists' },
    '/game-list': { status: 301, destination: '/game-lists' }
  },

  build: {
    /* Every page's CSS is ~9 KB compressed. As two external files it blocked
       first render for a round trip each; inline, it arrives with the HTML. */
    inlineStylesheets: 'always'
  },
  vite: {
    ssr: { external: ['node:buffer'] }
  }
});
