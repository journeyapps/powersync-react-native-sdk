import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import inject from '@rollup/plugin-inject';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (commandLineArgs) => {
  const sourcemap = (commandLineArgs.sourceMap || 'true') == 'true';

  // Clears rollup CLI warning https://github.com/rollup/rollup/issues/2694
  delete commandLineArgs.sourceMap;

  return {
    input: 'lib/index.js',
    output: {
      file: 'dist/main.js',
      format: 'cjs',
      sourcemap: sourcemap
    },
    plugins: [
      json(),
      nodeResolve({ preferBuiltins: false }),
      commonjs({}),
      inject({
        Buffer: ['@craftzdog/react-native-buffer', 'Buffer'],
        TextEncoder: ['text-encoding', 'TextEncoder'],
        TextDecoder: ['text-encoding', 'TextDecoder']
      }),
      alias({
        entries: [{ find: 'bson', replacement: path.resolve(__dirname, '../../node_modules/bson/lib/bson.rn.cjs') }]
      })
    ],
    external: [
      '@journeyapps/react-native-quick-sqlite',
      '@powersync/react',
      // '@powersync/common',
      'node-fetch',
      'react-native',
      'react-native/Libraries/Blob/BlobManager',
      'react'
    ]
  };
};
