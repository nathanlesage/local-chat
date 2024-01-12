module.exports = [
  // Add support for native node modules
  {
    test: /native_modules\/.+\.node$/,
    loader: 'node-loader'
  },
  {
    test: /\.(m?js|node)$/,
    parser: { amd: false },
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules'
      }
    }
  },
  {
    test: /\.vue$/,
    loader: 'vue-loader'
  },
  {
    test: /\.css$/,
    use: [
      'style-loader',
      'css-loader'
    ]
  },
  {
    // Most assets can simply be copied over into the output directory:
    // * png|jpe?g|svg|gif:   Images
    // * woff2?|eot|ttf|otf:  Fonts
    // * ogg|mp3|wav:         Audio files
    test: /\.(png|jpe?g|gif|woff2?|eot|ttf|otf|ogg|mp3|wav)$/,
    type: 'asset/resource'
  },
  {
    test: /\.svg$/,
    // SVGs work better inlined
    type: 'asset/source'
  },
  {
    test: /(.ts|.tsx)$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true,
        appendTsSuffixTo: [/\.vue$/] // Enable ts support in Vue SFCs
      }
    }
  }
]
