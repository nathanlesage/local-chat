const rules = require('./webpack.rules')

module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './src/main.ts',
  module: { rules },
  plugins: [],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ]
  }
}
