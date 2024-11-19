// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');
const { withNativeWind } = require("nativewind/metro");
const { getConfig } = require('react-native-builder-bob/metro-config');
const pkg = require('../package.json');


const projectRoot = __dirname;
/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

const parentRoot = path.resolve(projectRoot, '..');
const workspaceRoot = path.resolve(projectRoot, '../../..');

// 1. Watch all files within the monorepo
config.watchFolders = [parentRoot, workspaceRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(parentRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules')
];

// config.resolver.nodeModulesPaths = [
//   path.resolve(projectRoot, 'node_modules'),
//   path.resolve(parentRoot, 'node_modules'),
//   path.resolve(workspaceRoot, 'node_modules')
// ];

// let newConfig = getConfig(config, {
//   parentRoot,
//   pkg,
//   projectRoot,
// });

module.exports = withNativeWind(config, { input: "./global.css" });

// Learn more https://docs.expo.dev/guides/monorepos
// const { getDefaultConfig } = require('expo/metro-config');
// const path = require('node:path');
// const { withNativeWind } = require("nativewind/metro");
// const { getConfig } = require('react-native-builder-bob/metro-config');
// const pkg = require('../package.json');

// // Find the project and workspace directories
// const projectRoot = __dirname;
// const parentRoot = path.resolve(projectRoot, '..');
// const workspaceRoot = path.resolve(projectRoot, '../../..');

// const config = getDefaultConfig(projectRoot);

// // 1. Watch all files within the monorepo
// config.watchFolders = [parentRoot, workspaceRoot];
// // 2. Let Metro know where to resolve packages and in what order
// config.resolver.nodeModulesPaths = [
//   path.resolve(projectRoot, 'node_modules'),
//   path.resolve(parentRoot, 'node_modules'),
//   path.resolve(workspaceRoot, 'node_modules')
// ];

// let newConfig = getConfig(config, {
//   root: parentRoot,
//   project: projectRoot,
//   pkg: pkg,
// });

// module.exports = withNativeWind(config, { input: "./global.css" });
