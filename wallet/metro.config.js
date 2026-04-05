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

// Force browser-compatible builds for packages that import Node.js built-ins
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'axios') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/axios/dist/browser/axios.cjs'),
      type: 'sourceFile',
    };
  }
  // snarkjs main.cjs imports readline/crypto/fastfile (Node-only).
  // The UMD bundle (snarkjs.min.js) is pre-bundled and has no Node deps.
  if (moduleName === 'snarkjs') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/snarkjs/build/snarkjs.min.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
