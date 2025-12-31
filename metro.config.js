const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add path aliases for cleaner imports
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@features': path.resolve(__dirname, 'src/features'),
  '@shared': path.resolve(__dirname, 'src/shared'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@screens': path.resolve(__dirname, 'src/screens'),
  '@hooks': path.resolve(__dirname, 'src/hooks')
};

module.exports = config;