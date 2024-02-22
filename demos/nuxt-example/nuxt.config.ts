import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  vite: {
    optimizeDeps: {
      // Don't optimise these packages as they contain web workers and WASM files.
      // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
      exclude: ['@journeyapps/wa-sqlite', '@journeyapps/powersync-sdk-web'],
      include: ['object-hash', 'uuid', 'event-iterator', 'js-logger', 'lodash', 'can-ndjson-stream']
    },
    worker: {
      format: 'es',
      plugins: () => [wasm(), topLevelAwait()]
    }
  }
});
