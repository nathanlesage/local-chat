module.exports = {
  hooks: {},
  rebuildConfig: {
    // Since we must build native modules for both x64 as well as arm64, we have
    // to explicitly build it everytime for the correct architecture
    force: true // NOTE: By now covered by the global flag on packaging.
  },
  packagerConfig: {
    appBundleId: 'com.zettlr.local-chat',
    asar: {
      // We must add native node modules to this option. Doing so ensures that
      // the modules will be code-signed. (They still end up in the final
      // app.asar file, but they will be code-signed.) Code signing these dylibs
      // is required on macOS for the Node process to properly load them.
      unpack: '*.{node,dll,metal,exp,lib}' // .metal, .exp, and .lib are llama.cpp dependencies
    },
    darwinDarkModeSupport: 'true',
    // Electron-forge automatically adds the file extension based on OS
    icon: './static/icon',
    name: 'LocalChat'
  },
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        devContentSecurityPolicy: "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        port: 3000,
        loggerPort: 9001,
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/main-window/index.htm',
              js: './src/main-window/index.ts',
              name: 'main_window',
              preload: {
                js: './src/main-window/preload.ts'
              }
            }
          ]
        }
      }
    }
  ],
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {}
    },
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'Hendrik Erz',
        description: 'LocalChat is your personal assistant: An LLM running locally on your computer.'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    // BUG: The rpm builder doesn't like the fact that there are binaries with
    // the wrong architecture on x64
    // {
    //   name: '@electron-forge/maker-rpm',
    //   config: {}
    // }
  ]
}
