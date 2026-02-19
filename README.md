# Color Inspector

A Figma plugin for color detection, auditing, and selection.

## Features

- **Complete Color Visibility**: Scans the current page to detect every unique color (fills, strokes, text, effects)
- **Token Detection**: Clearly distinguishes between design tokens (variables/styles) and hard-coded hex values
- **Scoped Scanning**: Select a frame, section, or group to audit just that component
- **Actionable Selection**: Click any color to select all elements using it
- **Search & Filter**: Find colors by hex, token name, or property type
- **Live Updates**: Results update automatically as you edit your design
- **Multi-Select**: Shift+Click or Cmd/Ctrl+Click to select multiple color rows
- **Copy to Clipboard**: Click any color swatch to copy its value

## Development

### Prerequisites

- Node.js 18+ and npm
- Figma desktop app

### Setup

```bash
npm install
```

### Development Mode

```bash
npm run dev
```

Then in Figma:
1. Go to Plugins → Development → Import plugin from manifest
2. Select `dist/manifest.json` from this project
3. Enable "Hot reload plugin" for faster iteration

### Build for Production

```bash
npm run build
```

The plugin will be built to the `dist/` directory with:
- `code.js` - Main thread plugin code
- `ui.html` - Plugin UI (all CSS/JS inlined)
- `manifest.json` - Plugin manifest

## Architecture

### Main Thread (`src/plugin/`)
- `code.ts`: Plugin initialization, message handling, document change listener
- `scanner.ts`: Node traversal and color extraction engine
- `variable-resolver.ts`: Async Variable and Style API resolution
- `utils.ts`: Color normalization and gradient hashing

### UI Thread (`src/ui/`)
- `main.tsx`: Preact app entry point
- `App.tsx`: Root component with state management
- `components/`: All UI components (Header, ColorList, ColorRow, etc.)
- `hooks/`: Custom hooks for plugin messages and multi-select
- `utils/`: Clipboard and formatting utilities

### Shared (`src/shared/`)
- `types.ts`: TypeScript interfaces for ColorEntry, NodeRef, ScanContext
- `messages.ts`: Type-safe message protocol for main↔UI communication

## Tech Stack

- **TypeScript**: Type-safe plugin and UI code
- **Preact**: Lightweight React alternative (~4KB gzipped)
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast build tooling with HMR
- **Figma Plugin API**: Document traversal, variables, styles, selection

## Performance

- Scans 1,000 nodes in < 3 seconds
- Scans 10,000 nodes in < 15 seconds with progress indicator
- Search/filter results update in < 100ms
- Live updates complete within 500ms for typical pages

## Usage

1. Open Color Inspector from the Plugins menu
2. The plugin automatically scans the current page
3. **Optional**: Select a frame, section, or group before opening to scope the scan
4. Browse, search, and filter colors in the panel
5. Click any color row to select all elements using that color
6. Click a color swatch to copy its value to clipboard
7. Expand a row to see individual elements and zoom to them

## License

MIT
