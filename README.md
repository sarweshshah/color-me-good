<p align="center">
  <img src="assets/logo.png" alt="Color Me Good" width="128" height="128" />
</p>

<h1 align="center">
  Color Me Good
  <a href="CHANGELOG.md"><img src="https://img.shields.io/badge/v2.2-D1254B?style=flat" alt="v2.2" style="vertical-align: middle; margin-left: 6px;" /></a>
</h1>

<p align="center">A Figma plugin for color detection, auditing, and selection.</p>

Select elements on the canvas to scan every unique color in scope—fills, strokes, effects, gradients, and design tokens. Filter, sort, select, zoom, copy, and export results without leaving Figma.

## Features

**Scanning**
- Selection-based only — no full-page scan
- Fills, strokes, shadows, gradients, and multi-tone vector regions
- Token vs. hard-coded detection with library indicators
- Live updates on selection and document changes; session cache on reopen
- Optional: vectors, boolean children, gradient stop expansion, hidden layers

**Explore & act**
- Search by hex or token; filter by binding, property, node type, and visibility
- Sort by usage, hex, or token (toggle direction)
- Click a row to select all usages; expand for per-element list with progressive reveal
- Zoom to elements; Shift/Cmd+Click for multi-select; ⌘/Ctrl+Click to add to selection
- Copy swatch values; export filtered list as JSON, CSV, or clipboard

**Settings**
- Scan: include vectors, boolean children, expand gradients, hidden layers
- Display: color format (Hex, RGBA, HSLA, HSBA), UI theme (light / dark / system)
- Behavior: smooth zoom

## Usage

1. Run the plugin and **select** one or more nodes to scan.
2. Use search, filters, and sort to narrow the list. Click summary stats to filter by binding.
3. Click a color row to select usages, or expand to zoom to individual elements.
4. Copy a swatch or use the download icon to export the current filtered list.
5. Open **Settings** from the footer for scan and display preferences.

Panel is resizable (default 420×720). See [CHANGELOG](CHANGELOG.md) for release history.

## Development

**Prerequisites:** Node.js 18+, npm, Figma desktop

```bash
npm install
npm run dev    # watch build → dist/
npm run build  # production build
```

Load in Figma: **Plugins → Development → Import plugin from manifest** → `dist/manifest.json`. Enable hot reload for faster iteration.

Built with TypeScript, Preact, Tailwind, and Vite. Architecture and internals are documented in [development.md](development.md).

## License

MIT
