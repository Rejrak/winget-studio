# Winget Studio

Desktop UI for installing, updating, and removing apps with winget on Windows.

## Requirements
- Windows 10/11
- Windows Package Manager (`winget`) installed and available in PATH

## Development
```powershell
npm install
npm run build:css
npm start
```

## Build (NSIS installer)
```powershell
npm run build:css
npm run dist
```

The installer will be generated in `dist/`.

## Notes
- Some winget operations may require elevated permissions depending on the package.
- The app does not auto-run winget commands without explicit user actions.

## License
Proprietary. See `LICENSE.txt`.
