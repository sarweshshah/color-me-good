## Key Concepts

### Two-Thread Architecture

Figma plugins run in two isolated contexts:

1. **Main Thread** (`src/plugin/code.ts`): Has access to `figma.*` API (documents, nodes, variables, styles) but no DOM access. Cannot render UI.

2. **UI Thread** (`src/ui/main.tsx`): Runs in an iframe with DOM/CSS/JS but cannot access Figma API directly.

Communication between threads uses `postMessage`:

- Main → UI: `figma.ui.postMessage(msg)`
- UI → Main: `parent.postMessage({ pluginMessage: msg }, '*')`

### Color Scanning Algorithm

The scanner (`scanner.ts`) implements:

1. **Scope Resolution**: Check `figma.currentPage.selection` at scan start:
   - If exactly 1 FRAME/SECTION/GROUP selected → scoped scan
   - Otherwise → full-page scan

2. **Async Chunked Traversal**: Generator pattern that yields every 500 nodes to prevent UI freeze

3. **Color Extraction**: For each node:
   - Fills: SolidPaint → hex; GradientPaint → single gradient entity
   - Strokes: SolidPaint → hex
   - Text: `getStyledTextSegments` for character-level colors
   - Skip ImagePaint

4. **Variable/Style Detection**:
   - Check `node.boundVariables` for Variable bindings
   - Use async `getVariableByIdAsync` / `getVariableCollectionByIdAsync`
   - Check `fillStyleId` / `strokeStyleId` for Style bindings
   - Detect local vs. library via `variable.remote` / `style.remote`

5. **Deduplication**:
   - Solid colors: 8-char hex (RRGGBBAA) as key
   - Gradients: hash of full definition (type + stops + transform)

6. **Aggregation**: Build `Map<dedupKey, ColorEntry>` with usage counts and node refs

### Live Updates

The plugin automatically re-scans on document changes:

1. Register `figma.on('documentchange', callback)`
2. Debounce at 300ms to batch rapid changes
3. Re-scan using same scope context
4. Detect if scoped node was deleted → clear scope and re-scan full page
5. Post results to UI thread

### Caching & Iframe Resilience

The UI iframe can reload (e.g., on panel resize). To avoid re-scanning:

- Main thread caches last scan results (`cachedResults` variable)
- On iframe reload, immediately post cached results to new iframe
- Only trigger fresh scan if scope changed or no cache exists

## Development Workflow

### 1. Initial Setup

```bash
npm install
```

### 2. Start Development

```bash
npm run dev
```

This runs TypeScript compiler in watch mode and Vite in build watch mode.

### 3. Load Plugin in Figma

1. Open Figma desktop app
2. Menu → Plugins → Development → Import plugin from manifest
3. Select `dist/manifest.json`
4. Enable "Hot reload plugin" in Development menu

### 4. Test the Plugin

1. Create a test file with various elements (frames, shapes, text)
2. Apply some colors directly and some via variables/styles
3. Run the plugin from Plugins → Development → Color Me Good
4. Verify:
   - Colors are detected
   - Token-bound vs. hard-coded are distinguished
   - Selection works
   - Search/filter works
   - Scope indicator works when frame selected

### 5. Debug

**Main Thread**: Use `console.log()` in `src/plugin/*.ts` files. Output appears in:

- Figma Desktop: Developer Console (Help → Troubleshooting → Open Console)
- Figma Browser: Browser DevTools Console

**UI Thread**: Use `console.log()` in `src/ui/*.tsx` files. Output appears in:

- Right-click plugin panel → Inspect Element → Console tab

## Build System

### Vite Configuration

The `vite.config.ts` handles dual-entry build:

1. **code.ts → code.js**: Standard TypeScript bundle for main thread
2. **index.html → ui.html**: Preact app with inlined CSS/JS via custom plugin

The custom bundler plugin:

- Inlines all JavaScript chunks into `<script>` tags
- Inlines all CSS into `<style>` tags
- Renames `index.html` to `ui.html`
- Copies `manifest.json` to dist

This produces a self-contained UI file (Figma requirement).

### TypeScript Configuration

- `tsconfig.json`: For `src/` code (plugin + UI)
- `tsconfig.node.json`: For `vite.config.ts`

Key settings:

- `jsx: "react-jsx"` + `jsxImportSource: "preact"` for Preact
- `@figma/plugin-typings` for Figma API types
- Path alias `@/*` → `src/*`

## Testing Checklist

Before submitting a PR or release:

- [ ] Scan page with 1,000+ nodes (performance)
- [ ] Scan page with 10,000+ nodes (progress indicator)
- [ ] Test scoped scan (select frame → scan)
- [ ] Test multiple selection fallback (select 2 frames → shows tip)
- [ ] Test leaf node selection fallback (select rectangle → shows tip)
- [ ] Verify token-bound colors show green check + token name
- [ ] Verify hard-coded colors show orange dot + hex
- [ ] Verify library variables show library icon
- [ ] Test "Select All" for a color
- [ ] Test zoom-to-node for individual elements
- [ ] Test multi-select (Shift+Click, Cmd/Ctrl+Click)
- [ ] Test search (hex, token name)
- [ ] Test filters (token-bound, hard-coded, property types)
- [ ] Test sort (usage, hex, token)
- [ ] Test copy-to-clipboard (click swatch)
- [ ] Test live updates (edit color → list updates)
- [ ] Test scope deletion (delete scoped frame → resets to full page)
- [ ] Test clear scope button
- [ ] Test empty page (shows empty state)
- [ ] Verify gradients render correctly
- [ ] Verify text colors extracted (styled ranges)

## Known Limitations

- Simple list rendering (no virtual scrolling; fast enough for typical lists up to ~500 colors)

## Next Steps (Phase 2 / v2.0)

- ✓ Session persistence, include hidden layers, hidden-only filter, opacity/alpha (done)
- ✓ Effect color extraction (done in 1.2)
- ✓ JSON/CSV export (done in 2.2)

## Troubleshooting

**Problem**: Plugin doesn't load in Figma

- Check `dist/manifest.json` exists
- Verify `dist/code.js` and `dist/ui.html` exist
- Check Figma Console for errors

**Problem**: TypeScript errors

- Run `npm run typecheck` to see all errors
- Ensure `@figma/plugin-typings` is installed

**Problem**: UI not updating

- Check Figma DevTools Console for JS errors
- Verify message passing in main thread console

**Problem**: Build fails

- Clear `dist/` and `node_modules/`, reinstall, rebuild
- Check for syntax errors in recent changes
