# Changelog

All notable changes to Color Me Good will be documented in this file.

## [1.0.0] - 2026-02-21

### Added – Phase 1 (MVP)

#### Core scanning
- **Selection-based scanning only**: The plugin runs only when one or more elements are selected. Select frames, groups, or layers to see every unique color (fills, strokes, effects) in that scope. No full-page scan.
- **No-selection screen**: When nothing is selected, a dedicated screen with icon and short guidance tells you to select elements to scan.
- Extraction of fill colors (solids and gradients)
- Extraction of stroke colors
- Extraction of text colors (character-level)
- Recursive node traversal with async chunked processing (500-node batches)
- Progress indicator for large scans (10,000+ nodes)
- **Hidden nodes excluded** from scan results

#### Token & style detection
- Figma Variable (design token) detection with async API
- Figma Style detection
- Local vs. library variable distinction with visual indicator (📚)
- Token name and collection display alongside resolved hex values

#### Scope & selection
- Scan scope = current selection (single or multiple nodes). Scope indicator chip in header shows current scope.
- **Clear scope** (× on chip): Clears Figma selection and returns to the no-selection screen (no full-page scan).
- Automatic scope reset when the scoped node(s) are deleted

#### Results panel UI
- Plugin panel with dark theme; **resizable** via right edge, bottom edge, or bottom-right corner (default 420×640; range 420–540 × 640–840).
- Summary strip: total colors, token-bound, hard-coded, elements scanned. **Click summary stats** (Colors, Token-bound, Hard-coded) to set binding filter.
- Color list with swatch rendering (solid colors + gradients)
- Token-bound badge (green check) vs. hard-coded badge (orange dot)
- Library variable indicator icon
- Usage count per color
- Expandable rows showing individual elements (node name, layer path, property type) with **node type icons**

#### Search & filter
- Text search matching hex values, token names, style names
- Three-state binding filter: All / Token-bound / Hard-coded (also settable via summary strip)
- Property type filters: Fill, Stroke, Text, Effect (multi-select)
- **Node type filters**: Text, Shape, Frame, Section, Group, Component, Instance, and (when enabled in Settings) Vector
- Clear all filters button

#### Sort
- Sort by usage count (default, high → low)
- Sort by hex value
- Sort by token name

#### Selection & navigation
- Click color row → select all elements using that color
- Click **Select All** (crosshair) button → batch select all elements for that color (does not reset scope)
- Click individual element in expanded row → select and zoom to that node
- Multi-select support: Shift+Click (range), Cmd/Ctrl+Click (toggle)
- Figma native selection highlight + `scrollAndZoomIntoView`
- **Smooth zoom** option in Settings (persisted)

#### Copy to clipboard
- Click any color swatch to copy value
- Hex format for solid colors
- CSS gradient string for gradients
- Visual "Copied!" confirmation tooltip

#### Settings
- **Settings screen** (footer): **Include vectors** (default off) and **Smooth zoom** (default on). Persisted via Figma client storage.
- Canceling Settings with unsaved changes prompts to discard.

#### Live updates
- Automatic re-scan on document or selection change (debounced)
- Real-time color list updates as designs change
- Cached results survive iframe reload
- Scope change detection triggers fresh scan

#### Edge cases
- No-selection state with friendly guidance screen
- Empty scope (no colors found) message
- Large scope warning (50,000+ nodes)
- Scoped node deletion → auto-clear scope and error message
- Graceful error handling for corrupt node data
- Image fills silently skipped (not color data)

### Technical
- TypeScript for type safety
- Preact for lightweight UI (~4KB gzipped)
- Tailwind CSS for styling
- Vite build system with custom bundler
- Single-file UI bundle (inlined CSS/JS)
- 8-char hex normalization (RRGGBBAA)
- Gradient hash-based deduplication
- `@tanstack/virtual-core` dependency (available for future virtual list)

### Performance
- 1,000 nodes in &lt; 3 seconds
- 10,000 nodes in &lt; 15 seconds
- Search/filter &lt; 100ms
- Live update cycle &lt; 500ms for typical pages

---

## [Unreleased] – Phase 2 (Planned)

- Effect color extraction (shadows, glows)
- Opacity/alpha as distinct metadata
- Group by property type, token collection, or page
- JSON and CSV export
- Session persistence
- Virtual scrolling for 500+ colors

## [Unreleased] – Phase 3 (Planned)

- Multi-page scanning
- Toggle to include/exclude hidden layers in UI
- Color diff over time
- Batch replace colors
- Figma Dev Mode integration
