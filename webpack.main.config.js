const rules = require('./webpack.rules')
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  // Main entry point: the file that runs in the main process
  entry: './src/main.ts',
  module: { rules },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          // As of 3.0.0-beta.8, node-llama-cpp requires the build metadata files
          // to be present alongside the compiled binaries. With this command,
          // we are transferring them into the .webpack directory, keeping their
          // directory structure (i.e. for all provided prebuilt binaries.)
          from: "**/.buildMetadata.json",
          to: "native_modules/llamaBins/",
          context: "node_modules/node-llama-cpp/llamaBins/"
        }
      ]
    })
  ],
  resolve: {
    extensions: [ '.js', '.ts', '.jsx', '.tsx', '.css', '.json' ]
  }
}
