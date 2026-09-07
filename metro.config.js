const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;

config.resolver.assetExts = [...assetExts, 'lottie'];
config.resolver.sourceExts = sourceExts.filter(extension => extension !== 'lottie');

module.exports = config;
