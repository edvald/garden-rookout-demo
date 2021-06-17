module.exports = {
  devServer: {
    disableHostCheck: true,
    public: process.env.HOSTNAME ? 'http://' + process.env.HOSTNAME : undefined,
    progress: false,
    proxy: {
      '^/api': {
        target: 'http://api',
        changeOrigin: true,
        secure: false,
        logLevel: 'debug'
      },
    }
  },
};
