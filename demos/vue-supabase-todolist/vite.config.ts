// Plugins
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import Vue from '@vitejs/plugin-vue';
import ViteFonts from 'unplugin-fonts/vite';
import Components from 'unplugin-vue-components/vite';
import Vuetify, { transformAssetUrls } from 'vite-plugin-vuetify';

// Utilities
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    Vue({
      template: { transformAssetUrls }
    }),
    // https://github.com/vuetifyjs/vuetify-loader/tree/master/packages/vite-plugin#readme
    Vuetify(),
    Components(),
    ViteFonts({
      google: {
        families: [
          {
            name: 'Roboto',
            styles: 'wght@100;300;400;500;700;900'
          }
        ]
      }
    })
  ],
  define: { 'process.env': {} },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
    extensions: ['.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.vue']
  },
  optimizeDeps: {
    // Don't optimize these packages as they contain web workers and WASM files.
    // https://github.com/vitejs/vite/issues/11672#issuecomment-1415820673
    exclude: ['@journeyapps/wa-sqlite', '@journeyapps/powersync-sdk-web'],
    include: [
      '@journeyapps/powersync-sdk-common > uuid',
      '@journeyapps/powersync-sdk-web > event-iterator',
      '@journeyapps/powersync-sdk-web > js-logger',
      '@journeyapps/powersync-sdk-web > lodash/throttle',
      '@journeyapps/powersync-sdk-web > can-ndjson-stream'
    ]
  },
  worker: {
    format: 'es',
    plugins: () => [wasm(), topLevelAwait()]
  }
});
