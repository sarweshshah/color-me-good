# Changelog

All notable changes to Color Me Good will be documented in this file.

## [1.0.0] - 2026-02-21

### Added – Phase 1 (MVP) 🎉

#### Core scanning 🔍

- **Selection-based scanning only**: The plugin runs only when one or more elements are selected. Select frames, groups, or layers to see every unique color (fills and strokes) in that scope. No full-page scan.
- **No-selection screen**: When nothing is selected, a dedicated screen with icon and short guidance tells you to select elements to scan. 👆
- Extraction of fill colors (solids and gradients) 🎨
- Extraction of stroke colors ✏️
- Text layer colors (via fills and strokes; no character-level extraction) 📝
- Vector node colors optional (off by default in Settings: Include vectors) 📐
- Recursive node traversal with async processing; progress reported every 500 nodes ⚡
- Progress indicator during scan (progress bar and node count) 📊
- **Hidden nodes excluded** from scan results 🙈

#### Token & style detection 🏷️

- Figma Variable (design token) detection via bound variables (async API)
- Local vs. library variable distinction with visual indicator (📚)
- Token name and collection display alongside resolved hex values

#### Scope & selection 🎯

- Scan scope = current selection (single or multiple nodes). Scope indicator chip in header shows current scope.
- **Clear scope** (× on chip): Clears Figma selection and returns to the no-selection screen (no full-page scan). ❌
- Automatic scope reset when the scoped node(s) are deleted 🔄

#### Results panel UI 🖼️

- Plugin panel with Figma-themed UI (follows Figma light/dark); **resizable** via right edge, bottom edge, or bottom-right corner (default 420×720; range 420–540 × 640–840).
- Summary strip: total colors, token-bound, hard-coded, and total usages (Elements). **Click** Colors, Token-bound, or Hard-coded to set binding filter. 📈
- Color list with swatch rendering (solid colors + gradients) 🌈
- Token-bound badge (SwatchBook icon); no badge for hard-coded 📚
- Library variable indicator (📚) when color is from an imported library
- Usage count per color 🔢
- Expandable rows showing individual elements (node name, layer path, property type) with **node type icons** 📂

#### Search & filter 🔎

- Text search matching hex values and token names 🔤
- Three-state binding filter: All / Token-bound / Hard-coded (also settable via summary strip)
- Property type filters: Fill, Stroke, Text, Effect (multi-select; MVP data is fill and stroke only) 🎚️
- **Node type filters**: Text, Shape, Frame, Section, Group, Component, Instance, and (when enabled in Settings) Vector
- Clear all filters button 🧹

#### Sort ↕️

- Sort by usage count (default, high → low) 📊
- Sort by hex value #️⃣
- Sort by token name 🏷️

#### Selection & navigation 🖱️

- Click color row → select all elements using that color
- **Select All** (crosshair icon) → batch select all elements for that color (does not reset scope) 🎯
- Click individual element in expanded row → select and zoom to that node 🔍
- Multi-select support: Shift+Click (range), Cmd/Ctrl+Click (toggle) ⌨️
- Figma native selection highlight + `scrollAndZoomIntoView`
- **Smooth zoom** option in Settings (persisted) 🔎

#### Copy to clipboard 📋

- Click any color swatch to copy value
- Hex format for solid colors #️⃣
- CSS gradient string for gradients 🌈
- Visual "Copied!" confirmation (toast) ✅

#### Settings ⚙️

- **Settings screen** (footer): **Include vectors** (default off) and **Smooth zoom** (default on). Persisted via Figma client storage. 💾

#### Live updates 🔄

- Automatic re-scan on selection change (debounced 500ms) ⚡
- Automatic re-scan on document change (debounced 300ms) 📡
- Scope change detection triggers fresh scan 🔃

#### Edge cases 🛡️

- No-selection state with friendly guidance screen 👋
- Selection with no colors: "No colors found in selection" message 📭
- Large scope (50,000+ nodes): Figma toast suggests scoping to a selection ⚠️
- Scoped node deletion → selection cleared, no-selection screen, and error message 🗑️
- Graceful error handling for corrupt node data 🩹
- Image/gradient image fills not extracted (only solid and gradient paints) 🖼️

### Technical 🛠️

- TypeScript for type safety 📘
- Preact for lightweight UI (~4KB gzipped) ⚡
- Tailwind CSS for styling 🎨
- Vite build system with custom bundler 📦
- Single-file UI bundle (inlined CSS/JS) 📄
- 8-char hex normalization (RRGGBBAA) #️⃣
- Gradient hash-based deduplication 🔗

### Performance 🚀

- 1,000 nodes in < 3 seconds ⏱️
- 10,000 nodes in < 15 seconds ⏱️
- Search/filter < 100ms ⚡
- Live update cycle < 500ms for typical pages 🔄

---

## [1.1.0] – 2026-02-26

### Added ✨

- **Sort direction toggle**: Ascending/descending for all sort options (usage, hex, token name). Direction control in the filter bar with visual indicator (↑/↓). ↕️
- **Node type filters**: Filter colors by node type (Text, Shape, Frame, Section, Group, Component, Instance, and Vector when “Include vectors” is on). Multi-select; filtered list and expanded rows respect node type filters. 🎚️
- **Color value format setting**: Display format for resolved and hard-coded colors — Hex, RGBA, or HSLA — in Settings → Display. Persisted with other settings. 🎨
- **Settings screen updates**: Logo, Help link (README), and Change Log link in the footer for quick access to docs and changelog. ⚙️
- **Document change handling**: Listens to Figma `documentchange`; re-scans when the document changes and detects when the scoped node(s) are deleted, then clears scope and shows “Scoped element was deleted. Select something to scan.” 📡

### Changed 🔧

- **Panel dimensions**: Minimum height increased from 640px to 720px; default remains 420×720, range 420–540 × 720–840. 📐
- **ResizeHandles & SummaryStrip**: Refactored for consistent styling and layout with the rest of the UI. 🖼️
- **Button styling**: Improved hover and active states for main actions (e.g. back from settings, Select All). ✨
- **Badge readability**: Token-bound (and similar) badges use white text for better contrast. 🏷️
- **Light theme**: Tailwind and UI components adjusted so the plugin looks correct in Figma light theme as well as dark. 🌓
- **Color list filtering**: ColorList and ColorRow support `nodeTypeFilters`; expanded rows and visibility respect property and node type filters together. 🔎

---

## [1.2.0] – 2026-03-03

### Added ✨

- **UI theme selection**: Choose between Light, Dark, or System (auto-match OS) theme directly from Settings → Display. Preference is persisted across sessions. 🌓
- **Effect color extraction**: Drop shadows and inner shadows are now scanned and reported as color usages, so shadow colors appear alongside fills and strokes in results. 🎨
- **Dedicated About page**: About information (author, credits, links) is now on its own page accessible from the footer, keeping Settings focused on preferences. ℹ️
- **"Show more" pagination for elements**: Expanded color rows progressively reveal elements in batches instead of rendering the full list at once, improving performance for high-usage colors. 📄

### Changed 🔧

- **Faster selection response**: Selection-change debounce reduced from 500 ms to 150 ms for a snappier scanning experience. ⚡
- **Auto-resize summary strip**: The summary bar automatically widens the panel when stat labels overflow, preventing clipped text. 📐
- **Tighter sort dropdown**: The sort menu is more compact and better aligned with the filter bar. ↕️
- **Internal refactoring**: Shared constants, resize bounds, and node-filter logic consolidated into reusable modules for cleaner maintenance. 🛠️

---

## [Unreleased] – Phase 2 (Planned)

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

