<p align="center">
  <img src="assets/logo.png" alt="Color Me Good" width="128" height="128" />
</p>

<h1 align="center">Color Me Good</h1>

<p align="center">A Figma plugin for color detection, auditing, and selection.</p>

## Features

- **Selection-based scanning**: The plugin only runs when you have one or more elements selected. Select frames, groups, or layers in the canvas to see every unique color (fills, strokes, gradients) in that scope. No full-page scan—selection is required.
- **Token Detection**: Distinguishes design tokens (bound variables) from hard-coded hex; token and library indicators with icons.
- **No-selection screen**: When nothing is selected, a dedicated screen with icon and short guidance tells you to select elements to scan.
- **Actionable Selection**: Click any color row to select all elements using it; expand a row to see an element sub-list with node type icons (respecting active node-type filters); click an element to zoom to it. "Select All" (crosshair) does not reset scope.
- **Progressive Disclosure**: Expanded rows show the first 20 elements, then a **Show more** action reveals additional elements in batches.
- **Search, Filter & Sort**: Search by hex or token name. Filter by binding (All / Token-bound / Hard-coded), property (Fill, Stroke, Effect), and node type (Text, Shape, Frame, Section, Group, Component, Instance, Vector). Sort by usage, hex, or token name, and click the active sort option again to flip ascending/descending order.
- **Live Updates**: Results update when the document or selection changes; hidden nodes are excluded. Property changes in the active scope are applied with incremental patch updates for faster refresh, and startup state is replayed to avoid missing initial scan results. Vector node types are excluded by default with an optional "Include vectors" setting in Settings.
- **Multi-Select**: Shift+Click or Cmd/Ctrl+Click to select multiple color rows.
- **Copy to Clipboard**: Click any color swatch to copy its value.
- **Settings**: Persistent settings (Include vectors, Smooth zoom) via the Settings screen.

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
- `scanner.ts`: Node traversal plus full/incremental color extraction helpers
- `variable-resolver.ts`: Async Variable API resolution
- `utils.ts`: Color normalization and gradient hashing

### UI Thread (`src/ui/`)
- `main.tsx`: Preact app entry point
- `App.tsx`: Root component with state management and list/settings views
- `components/`: Header, SummaryStrip, SearchFilterBar, ColorList, ColorRow, Settings, Footer, etc.
- `hooks/`: usePluginMessages, useMultiSelect
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

1. Open Color Me Good from the Plugins menu.
2. Select one or more nodes (frames, groups, or layers) in the canvas. The plugin scans your selection and lists every unique color found there. If nothing is selected, a no-selection screen with guidance is shown.
3. Use the × next to the scope indicator to clear the selection and return to the no-selection screen.
4. Use the search bar and filter/sort controls to narrow and order the list. Click summary stats (Colors, Token-bound, Hard-coded) to filter by binding; use the filter menu for property and node type. Click the currently selected sort option again to flip sort direction. The summary reflects the filtered results.
5. Click a color row to select all elements using that color; expand the row to see the element list with node type icons (matching active node-type filters), then use **Show more** to progressively reveal more elements; click an element to zoom to it.
6. Click a color swatch to copy its value to the clipboard.
7. Open Settings from the footer to toggle “Include vectors” and “Smooth zoom”; resize the panel (default 420×720; min 420×720, max 540×840) by dragging the right edge, bottom edge, or bottom-right corner.

## License

MIT
