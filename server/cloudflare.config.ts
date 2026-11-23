import { bindings, defineConfig, exports } from 'cf/config';
import * as entrypoint from './src/index.js' with { type: 'cf-worker' };

export default defineConfig({
  worker: {
    name: 'global-chess-ultimate-private-rooms',
    entrypoint,
    compatibilityDate: '2026-11-23',
    env: {
      // Replace with the real HTTPS PWA origin before deployment.
      APP_ORIGINS: bindings.text('http://localhost:5173'),
    },
    exports: {
      MatchRoom: exports.durableObject({ storage: 'sqlite' }),
    },
  },
});
