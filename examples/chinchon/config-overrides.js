const webpack = require('webpack');

module.exports = function override(config) {
  const fallback = {
    path: require.resolve('path-browserify'),
    os: require.resolve('os-browserify/browser'),
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer/'),
    util: require.resolve('util/'),
    vm: require.resolve('vm-browserify')
  };

  config.resolve.fallback = {
    ...config.resolve.fallback,
    ...fallback
  };

  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ];
  config.module.rules.forEach(rule => {
    if (
      (typeof rule === 'string' && rule.includes('source-map-loader')) ||
      (typeof rule.loader === 'string' && rule.loader.includes('source-map-loader'))
    ) {
      if (!rule.exclude) {
        rule.exclude = [/node_modules\/@xmtp\/proto/];
      } else if (Array.isArray(rule.exclude)) {
        rule.exclude.push(/node_modules\/@xmtp\/proto/);
      } else {
        rule.exclude = [rule.exclude, /node_modules\/@xmtp\/proto/];
      }
    }
  });
  config.module.rules.push({
    test: /\.js$/,
    enforce: 'pre',
    use: ['source-map-loader'],
    exclude: [/node_modules\/@xmtp\/proto/],
  });
  return config;
};
