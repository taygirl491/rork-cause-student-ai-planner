const {
    getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

// Add resolver configuration for socket.io-client compatibility
config.resolver = {
    ...config.resolver,
    sourceExts: [...(config.resolver?.sourceExts || []), 'cjs'],
    assetExts: config.resolver?.assetExts?.filter((ext) => ext !== 'svg'),
};

module.exports = config;