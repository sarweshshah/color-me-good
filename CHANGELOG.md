# Changelog

All notable changes to Color Me Good will be documented in this file.

## [1.0.0] - 2026-02-19

### Added - Phase 1 (MVP)

#### Core Scanning
- Current-page color scanning across all node types
- Extraction of fill colors (solids and gradients)
- Extraction of stroke colors
- Extraction of text colors (character-level)
- Recursive node traversal with async chunked processing (500-node batches)
- Progress indicator for large scans (10,000+ nodes)

#### Token & Style Detection
- Figma Variable (design token) detection with async API
- Figma Style detection
- Local vs. library variable distinction with visual indicator
- Token name and collection display alongside resolved hex values

#### Scoped Scanning
- Auto-scope when single FRAME/SECTION/GROUP selected before scan
- Scope indicator chip in header showing current scope
- "Clear Scope" button to return to full-page scanning
- Automatic scope reset when scoped node is deleted

#### Results Panel UI
- 360×560 plugin panel with dark theme
- Summary strip: total colors, token-bound, hard-coded, elements scanned
- Color list with swatch rendering (solid colors + gradients)
- Token-bound badge (green check) vs. hard-coded badge (orange dot)
- Library variable indicator icon
- Usage count per color
- Expandable rows showing individual elements (node name, layer path, property type)

#### Search & Filter
- Text search matching hex values, token names, style names
- Three-state binding filter: All / Token-bound / Hard-coded
- Property type filters: Fill, Stroke, Text, Effect (multi-select)
- Clear all filters button

#### Sort
- Sort by usage count (default, high → low)
- Sort by hex value
- Sort by token name

#### Selection & Navigation
- Click color row → select all elements using that color
- Click "Select All" button → batch select all elements for a color
- Click individual element → select and zoom to that node
- Multi-select support: Shift+Click (range), Cmd/Ctrl+Click (toggle)
- Figma native selection highlight + `scrollAndZoomIntoView`

#### Copy to Clipboard
- Click any color swatch to copy value
- Hex format for solid colors
- CSS gradient string for gradients
- Visual "Copied!" confirmation tooltip

#### Live Updates
- Automatic re-scan on document changes (debounced at 300ms)
- Real-time color list updates as designs change
- Cached results survive iframe reload
- Scope change detection triggers fresh scan

#### Edge Cases
- Empty page handling with friendly message
- Large page warning (50,000+ nodes)
- Multiple selection fallback with tooltip
- Leaf node selection fallback with tooltip
- Scoped node deletion → auto-clear scope
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

### Performance
- 1,000 nodes in < 3 seconds
- 10,000 nodes in < 15 seconds
- Search/filter < 100ms
- Live update cycle < 500ms for typical pages

## [Unreleased] - Phase 2 Planned

- Effect color extraction (shadows, glows)
- Opacity/alpha as distinct metadata
- Group by property type, token collection, or page
- JSON and CSV export
- Session persistence
- Virtual scrolling for 500+ colors

## [Unreleased] - Phase 3 Planned

- Multi-page scanning
- Exclude hidden layers toggle
- Color diff over time
- Batch replace colors
- Figma Dev Mode integration
