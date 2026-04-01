const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable strict package exports resolution to fix @noble/hashes warning from ethers.js
config.resolver.unstable_enablePackageExports = false;

// Resolve packages that live nested inside expo's own node_modules
config.resolver.extraNodeModules = {
  '@expo/vector-icons': path.resolve(
    __dirname,
    'node_modules/expo/node_modules/@expo/vector-icons'
  ),
};

// Force axios to use its browser-compatible build instead of the Node.js build
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
