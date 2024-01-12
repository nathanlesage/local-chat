// const CopyWebpackPlugin = require('copy-webpack-plugin')
const rules = require('./webpack.rules')

module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './src/main.ts',
  module: { rules },
  plugins: [
    // new CopyWebpackPlugin({
    //   patterns: [
    //     // These are all static files that simply need to be bundled with the
    //     // application; we'll just copy them over from the static folder.
    //     { from: 'static/tutorial', to: 'tutorial' },
    //   ]
    // })
  ],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ]
  }
}
