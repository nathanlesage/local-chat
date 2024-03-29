const { FusesPlugin } = require('@electron-forge/plugin-fuses')
const { FuseV1Options, FuseVersion } = require('@electron/fuses')

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
    name: 'LocalChat',
    osxSign: {
      identity: 'Developer ID Application: Hendrik Erz (QS52BN8W68)',
      'signature-flags': 'library'
    },
    osxNotarize: ('APPLE_ID' in process.env && 'APPLE_ID_PASS' in process.env)
      ? {
          tool: 'notarytool',
          appleId: process.env.APPLE_ID,
          appleIdPassword: process.env.APPLE_ID_PASS,
          teamId: 'QS52BN8W68'
        }
      : false,
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
    },
    // When building for production, turn off a few fuses that disable certain
    // debug controls of the app.
    ...((process.env.NODE_ENV === 'production')
      ? [new FusesPlugin({
          version: FuseVersion.V1,
          [FuseV1Options.RunAsNode]: false,
          [FuseV1Options.EnableCookieEncryption]: true,
          [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
          [FuseV1Options.EnableNodeCliInspectArguments]: false
        })]
      : [])
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
        description: 'LocalChat is your personal assistant: An LLM running locally on your computer.',
        certificateFile: process.env.WIN32_CERT,
        certificatePassword: process.env.WIN32_CERT_PASS,
        // Don't ask me, read https://js.electronforge.io/interfaces/_electron_forge_maker_squirrel.InternalOptions.Options.html#iconUrl
        iconUrl: 'https://raw.githubusercontent.com/nathanlesage/local-chat/master/static/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-deb',
      config: {}
    },
    {
      name: '@electron-forge/maker-zip'
    }
    // BUG: The rpm builder doesn't like the fact that there are binaries with
    // the wrong architecture on x64
    // {
    //   name: '@electron-forge/maker-rpm',
    //   config: {}
    // }
  ]
}
