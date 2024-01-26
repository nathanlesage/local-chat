# Setup

Installing the app is as simple as it can get. Click on the "Download" button on the top of the page. This will open the release section with all available releases. The most recent one will be shown first and will have the label "Latest". There may be beta releases; but for the best experience, download the latest stable version.

LocalChat is being distributed for Macs (both Intel-based and Apple Silicon), Windows (x86 only; LocalChat is not available for Windows on ARM), and Debian-based Linux distributions. **Make sure to download the appropriate installer for your computer! Running the wrong architecture will not work.**

> Note: LocalChat does not yet have an automatic updating process in place, so for the time being, you will need to follow these instructions again to install an update. On macOS, simply replace the existing app with the update; on Windows, just run the installer again, which will replace the old version; and on Linux, the newer package should automatically remove the old one before installing itself. We plan on implementing auto updates in the future.

These are the available files for each release:

* `LocalChat-<version>-arm64.dmg`: For Apple Silicon Macs
* `LocalChat-<version>-x64.dmg`: For Intel-based Macs
* `LocalChat-<version>.Setup.exe`: For Windows PCs
* `LocalChat_<version>_amd64.deb`: For Intel (x86) based Linux PCs
* `LocalChat_<version>_arm64.deb`: For ARM-based Linux PCs
* `SHA256SUMS.txt`: This file contains SHA-256 checksums. You can use this file to verify that the installer has not been damaged or altered during download.
* `Source code`: The two "Source Code"-links will download the repository contents as either a ZIP-file or a tarball. You usually do not want to download this.

## macOS Setup instructions

Installation on macOS is very simple: Download the appropriate file, double-click it, and then drag "LocalChat.app" into your applications folder. When you first start the application, macOS will ask for confirmation to run the app. The app may also ask for permission to access folders on your computer.

> Note: If you accidentally download the Apple Silicon-installer onto an Intel-based Mac, the Mac will tell you that you are unable to run it. However, if you accidentally download the Intel-based installer onto an Apple Silicon-based Mac, it will run. However, this will heavily impact performance, so make sure you download the correct file.

You can uninstall LocalChat by simply deleting the app from your Applications folder.

## Windows Setup instructions

On Windows, the process is even simpler: You only need to double-click the installer. It will automatically install the app for your user and you will not need to give it administrative access. After it has been installed, a small window will appear on top of the LocalChat window that will install an updater. At the time of writing, LocalChat does not yet possess the ability to update itself automatically, however we plan on implementing this in the future.

After the app has been launched, you should pin it to your task bar or create a Desktop shortcut for it, since it can be difficult to find the installer later on.

You can uninstall LocalChat by uninstalling the app from the list of installed programs.

## Linux Setup instructions

LocalChat is compatible with any Debian-based Linux distribution -- basically anything that supports installing `*.deb`-files. To do so, download the correct file and run it either with `dpkg` on the terminal, or use a graphical app manager to install the file.

You can uninstall LocalChat by removing the app from aptitude with either a graphical interface, or on the terminal. Refer to the operating system's manual for precise steps.
