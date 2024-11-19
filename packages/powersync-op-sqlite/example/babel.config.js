const path = require('path');
const pak = require('../package.json');

module.exports = {
  presets: [
    ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    'nativewind/babel',
  ],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          [pak.name]: path.join(__dirname, '..', pak.source),
          stream: 'stream-browserify',
        },
      },
    ],
    'babel-plugin-transform-typescript-metadata',
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    'react-native-reanimated/plugin',
  ],
};
