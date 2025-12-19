# ADB File Commander

A Midnight Commander-style dual-panel file manager with ADB support for copying files to/from Android devices.

![Terminal File Manager](https://img.shields.io/badge/Terminal-File%20Manager-blue)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## Features

- **Dual-panel interface** - Browse local and remote (Android) directories side by side
- **ADB Integration** - Copy files directly to/from your Android device
- **Keyboard-driven** - Fast navigation with intuitive shortcuts
- **Beautiful TUI** - Modern terminal interface with colors and box drawing
- **Multi-select** - Select multiple files and directories for batch operations

## Requirements

- Node.js 18+
- ADB (Android Debug Bridge) installed and in PATH
- Android device connected via USB with USB debugging enabled

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/adb-file-commander.git
cd adb-file-commander

# Install dependencies
npm install

# Run the application
npm start
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate files |
| `←` `→` or `Tab` | Switch panels |
| `Enter` | Enter directory / Execute |
| `Space` | Select/Deselect file |
| `a` | Select all |
| `n` | Deselect all |
| `c` | Copy selected to other panel |
| `m` | Move selected to other panel |
| `d` | Delete selected (with confirmation) |
| `r` | Refresh current panel |
| `h` | Toggle hidden files |
| `.` | Go to parent directory |
| `~` | Go to home directory |
| `/` | Go to root / Android root |
| `g` | Go to path (input dialog) |
| `t` | Toggle panel type (Local/ADB) |
| `q` | Quit |

## Panel Types

- **Local** - Browse your local filesystem
- **ADB** - Browse connected Android device via ADB

Press `t` to toggle between local and ADB mode for the active panel.

## Examples

### Copy files to Android

1. Navigate to files on left panel (local)
2. Select files with `Space`
3. Switch to right panel with `Tab`
4. Set right panel to ADB mode with `t`
5. Navigate to destination folder
6. Switch back to left panel
7. Press `c` to copy

### Pull files from Android

Same process but reversed - select files in ADB panel and copy to local panel.

## License

MIT

