**PRODUCT REQUIREMENTS DOCUMENT**

**Color Inspector**

A Figma Plugin for Color Detection, Auditing & Selection

|                  |                                 |
| ---------------- | ------------------------------- |
| **Version**      | 1.0                             |
| **Date**         | February 20, 2026               |
| **Status**       | Draft – Ready for Review        |
| **Author**       | Product Management              |
| **Stakeholders** | Design Systems, Engineering, QA |

_This document defines the product requirements for Color Inspector, a Figma plugin that scans the current page to detect every color in use—both resolved hex values and design token references—and enables designers to search, filter, and select the elements where those colors are applied._

# 1. Executive Summary

Color Inspector is a Figma plugin designed to give designers and design-system maintainers complete visibility into every color used on the current page—or within a specific selection. It detects both resolved (hard-coded hex/RGBA) colors and design token references (variables and styles), surfaces them in a searchable, filterable panel, and lets users select every element where a given color is applied—all without leaving Figma. When the user has one or more nodes selected before scanning, the plugin limits its scope to those nodes (and their descendants where applicable), enabling targeted audits of a single element, a frame, or multiple elements at once.

The plugin addresses a critical gap in the current Figma workflow: there is no native way to audit all colors on a page (or a subsection of it), identify off-spec or orphaned values, or batch-select elements by color. Design teams today rely on manual inspection or fragmented community plugins that only partially solve the problem. Color Inspector unifies detection, auditing, and selection into a single, high-performance tool.

# 2. Problem Statement

## 2.1 The Pain

Design teams working on large-scale products routinely encounter the following problems:

- **Color drift:** Over weeks and months, designers introduce slight variations of brand colors (e.g., #2563EB vs. #2462EA). These are invisible to the naked eye but create inconsistency in production code.

- **Token adoption gaps:** Even when a design-system team publishes a token library, there is no efficient way to verify that every fill, stroke, and text color in a document actually references a token rather than a hard-coded value.

- **Batch operations are impossible:** Figma’s native “Select All with Same Fill” misses strokes, text colors, and effect colors. There is no cross-property equivalent that covers all color applications on a page.

- **Handoff ambiguity:** Developers receiving a Figma file cannot quickly distinguish between intentional one-off colors and accidental deviations from the system.

## 2.2 Who Feels It Most

| **Persona**              | **Pain Severity** | **Frequency**                             |
| ------------------------ | ----------------- | ----------------------------------------- |
| Design System Maintainer | Critical          | Weekly token audits, migration projects   |
| Product Designer         | High              | Every handoff, every QA cycle             |
| Design Lead / Manager    | Medium–High       | Design reviews, brand compliance checks   |
| Front-End Developer      | Medium            | Inspecting specs, verifying token mapping |

# 3. Goals & Success Metrics

## 3.1 Product Goals

1.  **Complete color visibility:** Surface every unique color in a document (fills, strokes, text, effects) within seconds of running the plugin.

2.  **Token vs. hard-coded clarity:** Clearly distinguish between colors that reference a Figma variable/style and those that are raw hex/RGBA values.

3.  **Actionable selection:** Allow users to click any color in the panel and instantly select every element on the current page that uses it.

4.  **Search & filter:** Enable fast lookup by hex code, token name, color property type, or page.

## 3.2 Success Metrics (KPIs)

| **Metric**                          | **Target (6 months)** | **Measurement**           |
| ----------------------------------- | --------------------- | ------------------------- |
| Plugin installs                     | 10,000+               | Figma Community analytics |
| Weekly active users (WAU)           | 2,500+                | Figma plugin analytics    |
| Avg. scan time (1,000-node file)    | < 3 seconds           | Internal benchmarks       |
| User satisfaction (post-use survey) | ≥ 4.3 / 5.0           | In-plugin micro-survey    |
| Figma Community rating              | ≥ 4.5 stars           | Community page            |

# 4. User Stories & Use Cases

## 4.1 Core User Stories

| **ID** | **As a…**                | **I want to…**                                                                                  | **So that…**                                                                                                     |
| ------ | ------------------------ | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| US-01  | Design System Maintainer | scan the current page and see every unique color with its usage count                           | I can identify off-spec or orphaned colors during audits                                                         |
| US-02  | Design System Maintainer | see which colors are bound to tokens and which are hard-coded                                   | I can measure token adoption across the file                                                                     |
| US-03  | Product Designer         | search for a specific hex value or token name and select all elements using it                  | I can quickly update or replace a color across my designs                                                        |
| US-04  | Product Designer         | filter colors by property type (fill, stroke, text, effect)                                     | I only see colors relevant to the task at hand                                                                   |
| US-05  | Design Lead              | export a color audit report (JSON/CSV)                                                          | I can share findings in design reviews or with engineering                                                       |
| US-06  | Developer                | view a color’s token name alongside its resolved value                                          | I know exactly which token to use in code                                                                        |
| US-07  | Any User                 | click a color swatch and have Figma select all matching elements                                | I can visually verify where a color appears or batch-edit it                                                     |
| US-08  | Any User                 | see the color list update automatically as I make changes in the canvas                         | I get continuous feedback without any manual refresh step                                                        |
| US-09  | Any User                 | select one or more nodes (any type) before scanning and have the plugin only analyze that scope | I can audit a specific component, a single element, or multiple elements without noise from the rest of the file |

## 4.2 Detailed Use Case: Token Adoption Audit

**Trigger:** A design-system maintainer opens a product Figma file and navigates to a key page containing 12,000+ nodes to prepare for a quarterly token audit.

1.  The maintainer opens Color Inspector from the Figma Plugins menu.

2.  The plugin displays a loading indicator while traversing all nodes on the current page.

3.  Within a few seconds, the Results Panel shows 83 unique colors sorted by usage count.

4.  The maintainer toggles the “Show only hard-coded” filter. The list narrows to 19 colors that are not bound to any variable or style.

5.  For the most-used offending color (#2563EB, used on 214 elements), the maintainer clicks “Select All.” Figma selects all 214 elements on the page.

6.  The maintainer uses Figma’s native batch-edit to reassign the correct token.

7.  The color list updates automatically—the count drops in real time. The workflow repeats until all hard-coded colors are resolved.

8.  Finally, the maintainer exports the audit as a CSV and attaches it to the team’s quarterly design-system health report.

# 5. Functional Requirements

## 5.1 Color Scanning Engine

| **Req ID** | **Requirement**                                                                                                                            | **Priority** | **Notes**                                                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01      | Traverse the current page and all node types; exclude vector types by default (optional "Include vectors" filter); skip hidden nodes       | P0           | Use figma.currentPage.children and recurse; node.visible === false excluded                                                                             |
| FR-01a     | If the user has one or more nodes selected at scan time, limit traversal to that selection (any node type; multi-select supported)         | P0           | Check figma.currentPage.selection on scan start                                                                                                         |
| FR-01b     | Display a visible scope indicator in the header showing whether the scan covers “Entire Page” or the name of the selected scope node       | P0           | Updates automatically when selection changes; shows "N elements" for multi-selection                                                                    |
| FR-01c     | Provide a “Clear Scope / Scan Full Page” action to switch back to page-wide scanning                                                       | P0           | One-click reset; deselects the scope node                                                                                                               |
| FR-02      | Extract fill colors: solid fills as individual color entries, gradient fills (linear, radial, angular, diamond) as single gradient entries | P0           | Display gradient as a mini swatch showing the full gradient; do not decompose into individual stops                                                     |
| FR-03      | Extract stroke colors                                                                                                                      | P0           | Include stroke weight context in metadata                                                                                                               |
| FR-04      | Treat text layers like other nodes: extract only fill and stroke (no separate "text" property)                                             | P0           | Text nodes contribute via node.fills / node.strokes only                                                                                                |
| FR-05      | Extract effect colors (shadows, glows)                                                                                                     | P1           | Drop shadow, inner shadow, layer/background blur tints                                                                                                  |
| FR-06      | Detect Figma Variables (design tokens) bound to color properties, and determine whether each variable is local or from an external library | P0           | Use figma.variables.getVariableById() and boundVariables API; check variable.remote to distinguish local vs. library                                    |
| FR-07      | Token detection based on bound variables only (no fillStyleId/strokeStyleId fallback in MVP)                                               | P1           | Style-based tokens may be considered in a later phase                                                                                                   |
| FR-08      | Resolve variable/style to display both token name and resolved hex value                                                                   | P0           | Show: Token “primary/blue-600” → #2563EB                                                                                                                |
| FR-09      | Handle opacity (alpha channel) as a distinct attribute                                                                                     | P1           | Store as separate metadata; group or split by user preference                                                                                           |
| FR-10      | Deduplicate identical colors and gradients                                                                                                 | P0           | Solid colors: normalize to 8-char hex (RRGGBBAA). Gradients: hash the full gradient definition (type + stops array + positions + angle) for comparison. |

## 5.2 Results Panel (UI)

| **Req ID** | **Requirement**                                                                                                                                                                                                                                                                                               | **Priority** | **Notes**                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
| FR-11      | Every color and gradient entry must display a rendered swatch as the primary visual identifier, placed immediately to the left of the text identifier (token name or hex value). Solids render as a flat filled square; gradients render the actual gradient. The swatch is always visible and never omitted. | P0           | Primary view; swatch is the first thing the eye reads in each row                                       |
| FR-12      | Sort by: usage count (default), hex value, token name                                                                                                                                                                                                                                                         | P0           | Sort icon with dropdown menu                                                                            |
| FR-13      | Group by: property type (fill/stroke/text/effect), token collection, page                                                                                                                                                                                                                                     | P1           | Collapsible sections                                                                                    |
| FR-14      | Indicate token binding status with a visual badge (e.g., green check for token, orange dot for hard-coded)                                                                                                                                                                                                    | P0           | Critical for audit workflows                                                                            |
| FR-14a     | For token-bound colors, display a small icon next to the token name indicating whether the variable is local or from an external library                                                                                                                                                                      | P0           | Icon only, no additional text. Helps disambiguate when local and library variables share the same name. |
| FR-15      | Display total unique color count and total element count in a summary bar                                                                                                                                                                                                                                     | P1           | Top of panel                                                                                            |
| FR-16      | Show a mini-breakdown: X token-bound, Y hard-coded, Z mixed                                                                                                                                                                                                                                                   | P1           | Adjacent to summary                                                                                     |

## 5.3 Search & Filter

| **Req ID** | **Requirement**                                                                          | **Priority** | **Notes**                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| FR-17      | Text search field that matches against hex value, RGB values, token name, and style name | P0           | Real-time filtering as user types                                                                   |
| FR-18      | Filter toggle: Show All \| Token-bound Only \| Hard-coded Only                           | P0           | Three-state segmented control                                                                       |
| FR-19      | Filter by property type: Fill, Stroke, Effect (multi-select)                             | P1           | In filter dropdown; no "Text" (text layers use fill/stroke only). _Implemented._                    |
| FR-19a     | Filter by node type: Text, Shape, Frame, Section, Group, Component, Instance, Vector     | P1           | In filter dropdown; “Shape” groups rectangle, ellipse, line, star, polygon, boolean. _Implemented._ |
| FR-21      | Clear all filters button                                                                 | P0           | Reset to default view. _Implemented._                                                               |

## 5.4 Selection & Navigation

| **Req ID** | **Requirement**                                                                                                                                                                                                                          | **Priority** | **Notes**                                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------- |
| FR-22      | Click a color row → select ALL elements using that color on the current page                                                                                                                                                             | P0           | Uses Figma’s native selection API; no page-switching needed    |
| FR-23      | Expand a color row to see a sub-list of individual elements (node type icon, node name, layer path, property type fill/stroke/effect)                                                                                                    | P0           | Full-bleed sub-rows; node type icon per element; click to zoom |
| FR-24      | Click an individual element row → select that single element and zoom to it                                                                                                                                                              | P0           | figma.viewport.scrollAndZoomIntoView()                         |
| FR-25      | Multi-select: Shift+Click selects a contiguous range of color rows; Cmd/Ctrl+Click toggles individual non-contiguous rows. All elements across selected rows are added to the Figma selection.                                           | P0           | Essential for comparing and batch-editing related colors       |
| FR-26      | Rely on Figma’s native selection highlight (blue bounding box) for visual confirmation when elements are selected via the plugin. Combine with figma.viewport.scrollAndZoomIntoView() to ensure selected elements are visible on screen. | P0           | No custom highlight needed; leverages familiar Figma behavior  |

## 5.5 Export & Reporting

| **Req ID** | **Requirement**                                                                                   | **Priority** | **Notes**                    |
| ---------- | ------------------------------------------------------------------------------------------------- | ------------ | ---------------------------- |
| FR-27      | Export color audit as JSON (structured data with token names, hex values, usage counts, node IDs) | P1           | For programmatic consumption |
| FR-28      | Export color audit as CSV                                                                         | P1           | For spreadsheets and reports |
| FR-29      | Copy a color’s value to clipboard on click: hex for solids, CSS gradient string for gradients     | P0           | Utility feature              |

## 5.6 Live Updates & State

| **Req ID** | **Requirement**                                                                                                                                                                                                                                                                                                          | **Priority** | **Notes**                                                                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| FR-30      | Automatically re-scan and update the color list in real time when the document changes (node added, deleted, or property edited)                                                                                                                                                                                         | P0           | Listen to figma.on(“documentchange”) events; debounce at ~300ms to avoid excessive recomputation                          |
| FR-31      | Cache the last scan results and scope context in the main thread (which survives iframe reloads). When the UI iframe reloads (e.g., on panel resize), immediately re-send the cached results to the UI without re-scanning. Only trigger a fresh scan if the user’s selection (scope) has changed since the cached scan. | P0           | Main thread persists across iframe lifecycle; compare cached ScanContext.scopeNodeId against current selection on UI init |
| FR-32      | Show a subtle “live” indicator or last-updated timestamp in the header                                                                                                                                                                                                                                                   | P2           | Reassures the user that results are current                                                                               |

# 6. Non-Functional Requirements

| **Category**  | **Requirement**                                                                                                    | **Target**                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Performance   | Scan 1,000 nodes in under 3 seconds                                                                                | Measured on a mid-range laptop (M1 MacBook Air)                               |
| Performance   | Scan 10,000 nodes in under 15 seconds with progress indicator                                                      | Async chunked traversal to avoid UI freeze                                    |
| Performance   | Search/filter results should feel instant (< 100ms)                                                                | Pre-indexed data structures                                                   |
| Performance   | Live update cycle (documentchange → re-scan → UI refresh) should complete within 500ms for pages under 5,000 nodes | Debounce at 300ms; diff-based UI updates                                      |
| Scalability   | Handle pages with up to 50,000 nodes gracefully                                                                    | Warn if page is very large; suggest scoping to a selection for faster results |
| Reliability   | Gracefully handle nodes with missing or corrupt paint data                                                         | Skip and log; never crash the plugin                                          |
| Accessibility | All UI elements keyboard-navigable; color swatches include hex text labels                                         | WCAG 2.1 AA compliance for the plugin UI itself                               |
| Security      | No data leaves the user’s machine; plugin runs entirely client-side                                                | Zero network calls; no telemetry beyond Figma’s own                           |
| Compatibility | Support Figma desktop app and browser (latest 2 versions)                                                          | Test matrix includes macOS, Windows, Chrome, Firefox, Safari                  |

# 7. Information Architecture & UI Layout

The plugin UI is a single resizable panel (default ~440×720; min 360×750, max 800×840). Resize from the right edge, bottom edge, or bottom-right corner. Vertical layout:

## 7.1 Panel Structure

1.  **Header Bar:** Plugin title (“Color Inspector”). Below the title, a scope indicator chip: “Scope: Entire Page”, “Scope: [NodeName]”, or “N elements” for multi-selection, with an “×” to clear scope. No manual scan button—results update automatically.

2.  **Summary Strip:** Total colors count, token-bound count, hard-coded count, total elements scanned. Displayed as compact stat chips; clicking Colors / Token-bound / Hard-coded applies the corresponding binding filter. Elements count is display-only.

3.  **Search & Filter Bar:** Text input for search. Filter dropdown: property type (Fill, Stroke, Effect) and node type (Text, Shape, Frame, Section, Group, Component, Instance, Vector). “Include vectors” is a persistent setting in Settings, not a filter chip. Sort dropdown: “Sort by Usage (High → Low)” | “Sort by Hex” | “Sort by Token Name.” Clear filters control resets search and all filters.

4.  **Color List (scrollable, virtualized):** Each row: 24px rendered swatch (always present; flat color for solids, actual gradient for gradients) → Text identifier (token name if bound, hex value if hard-coded; gradient type label for gradients) → Token/hard-coded badge → Usage count badge → “Select All” button. The swatch is the primary visual anchor for every row.

5.  **Expanded Element Sub-list:** When a color row is expanded, show child rows: Node type icon, node name, layer path, property type (fill/stroke). Clicking an element zooms to it (optional smooth zoom via Settings).

6.  **Footer Bar:** “Settings” button (opens full Settings view), “Help” link, version number. Export (JSON/CSV) is planned for Phase 2.

## 7.2 Interaction States

| **State**                | **Behavior**                                                                                                                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial Load             | Plugin auto-scans on open. Shows a brief loading indicator. If one or more nodes are selected, the scope is set to that selection (any node type).                                                                                  |
| Scanning                 | Progress bar with node count (“Scanning… 4,218 / 12,000 nodes”). Cancel button available.                                                                                                                                           |
| Scoped Scan Active       | Scope indicator chip in the header shows “Scope: [NodeName]” with an “×” button. All results, counts, and exports reflect only the scoped subtree. A subtle banner below the summary reads “Showing colors within [NodeName] only.” |
| Results Loaded           | Summary strip populates; color list renders. Search bar becomes active.                                                                                                                                                             |
| No Results (post-filter) | Friendly message: “No colors match your filters. Try broadening your search.”                                                                                                                                                       |
| Settings View            | Full-screen Settings: Scan (Include vectors), Behavior (Smooth zoom), About (plugin name, version, Help link). Footer shows Cancel and Done. Cancel with unsaved changes opens a "Discard changes?" modal.                          |
| Error                    | Toast notification with retry option: "Something went wrong. The plugin will retry automatically."                                                                                                                                  |

# 8. Technical Architecture

## 8.1 Plugin Anatomy

Figma plugins operate in a sandboxed environment with two execution contexts that communicate via message passing:

- **Main Thread (code.ts):** Has access to the Figma document API (figma.root, node traversal, variables, styles). Runs in a restricted sandbox without DOM access.

- **UI Thread (ui.html):** An iframe that renders the plugin’s user interface. Has full DOM/CSS/JS access but cannot touch the Figma API directly.

Communication between threads is via figma.ui.postMessage() (main → UI) and parent.postMessage() (UI → main), using structured JSON payloads.

## 8.2 Scanning Algorithm (Main Thread)

The scanning engine is the core of the plugin. It must be performant, exhaustive, and non-blocking.

1.  **Scope resolution:** Before traversal begins, check figma.currentPage.selection. If the selection contains exactly one node of type FRAME, SECTION, or GROUP, use that node as the traversal root (scoped scan). Otherwise, use figma.currentPage.children for a full-page scan. Store the scope context (node ID + name, or “entire page”) and send it to the UI thread for the scope indicator.

2.  **Recursive traversal:** Starting from the resolved root (either the scoped node or figma.currentPage.children), recursively visit every child node using an async generator pattern that yields control every 500 nodes to prevent UI freezing.

3.  **Color extraction per node:** For each SceneNode, inspect: fills (SolidPaint as individual colors, GradientPaint as a single gradient entity), strokes (SolidPaint), characters (getRangeFillStyleId, getRangeFills for text nodes), effects (DropShadowEffect.color, InnerShadowEffect.color).

4.  **Variable/style detection:** Check node.boundVariables for fill, stroke, and effect bindings. Check node.fillStyleId, strokeStyleId, effectStyleId for style bindings. Resolve variable IDs to their names and collections via figma.variables.getVariableById().

5.  **Normalization:** For solid colors, convert to 8-char uppercase hex (RRGGBBAA) as the deduplication key. For gradients, generate a hash of the full gradient definition (type, stops with colors and positions, angle/transform) as the deduplication key. Store metadata: token name, style name, property type, node ID.

6.  **Aggregation:** Build a Map<dedupKey, ColorEntry> where the key is either a hex string (solids) or a gradient hash (gradients). ColorEntry holds all shared fields plus type-specific data.

7.  **Message to UI:** Post the aggregated color map to the UI thread as a serialized JSON payload. For very large datasets (50,000+ nodes), consider chunked messaging.

8.  **Live updates:** Register figma.on(“documentchange”, callback) to listen for node property changes. On each change event, debounce at ~300ms, then re-run the scan from step 1 using the same scope context. Diff the new results against the previous color map and send only the delta to the UI thread for efficient re-rendering.

## 8.3 Key Data Structures

The following TypeScript interfaces describe the core data model:

**ColorEntry** – represents a single unique color or gradient in the document. Fields: type (“solid” | “gradient”), hex (string | null, for solids only), rgba ({r, g, b, a} | null, for solids only), gradient ({gradientType, stops: [{color, position}], angle/transform} | null, for gradients only), dedupKey (string), tokenName (string | null), tokenCollection (string | null), isLibraryVariable (boolean, true if variable is from an external library), styleName (string | null), styleId (string | null), propertyTypes (Set of “fill” | “stroke” | “text” | “effect”), nodes (array of NodeRef), usageCount (number), isTokenBound (boolean).

**NodeRef** – a lightweight pointer to a specific usage. Fields: nodeId (string), nodeName (string), layerPath (string, e.g. “Frame > Group > Rectangle”), propertyType (string), propertyIndex (number, for multi-fill layers).

**ScanContext** – metadata describing the scope of the current scan. Fields: mode (“page” | “selection”), scopeNodeId (string | null), scopeNodeName (string | null), scopeNodeType (“FRAME” | “SECTION” | “GROUP” | null), totalNodesScanned (number), timestamp (ISO string).

_Implementation note: NodeRef includes nodeType for UI icon display. ScanContext includes scopeNodeIds (string[]) for multi-selection scope. Property types in use are fill, stroke, effect (no "text" property)._

## 8.4 Tech Stack

| **Layer**    | **Technology**                  | **Rationale**                                                        |
| ------------ | ------------------------------- | -------------------------------------------------------------------- |
| Main thread  | TypeScript                      | Type safety for complex Figma API interactions                       |
| UI framework | Preact or Svelte                | Lightweight (< 5KB gzipped); fast list rendering for 100+ color rows |
| UI styling   | CSS Modules or Tailwind (JIT)   | Scoped styles; no conflicts with Figma’s own CSS                     |
| Build tool   | Vite + Figma plugin template    | Fast dev server; handles dual-entry (code.ts + ui.html)              |
| Virtual list | @tanstack/virtual-core          | Implemented for smooth scrolling with large color lists              |
| Testing      | Vitest + Figma Plugin API mocks | Unit test scanning logic without a live Figma instance               |

# 9. Edge Cases & Error Handling

| **Scenario**                                                       | **Expected Behavior**                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty page (no nodes)                                              | Show empty state: “No layers found on this page. Add some elements and scan again.”                                                                                                                                                                              |
| Node with no fills or strokes                                      | Skip silently; do not count as a color.                                                                                                                                                                                                                          |
| Gradient fill (linear/radial/angular/diamond)                      | Treat as a single gradient entry, consistent with how Figma represents gradients. Display as a mini gradient swatch in the color list. Tag property as “fill (gradient).” Deduplicate by comparing the full gradient definition (type, stops, positions, angle). |
| Image fill                                                         | Ignore (not a color). Do not extract dominant color.                                                                                                                                                                                                             |
| Text nodes                                                         | Treated like other nodes: only node-level fill and stroke are extracted; no character-level "text" property. Element count aligns with Figma selection colors.                                                                                                   |
| Hidden or locked layers                                            | Hidden nodes (visible === false) are excluded from the scan by default; their colors are not counted. Locked nodes are included.                                                                                                                                 |
| Component instances with overridden colors                         | Detect the overridden (resolved) color, not the main component’s default.                                                                                                                                                                                        |
| Detached instances / deleted component sources                     | Treat as regular frames; scan their colors normally.                                                                                                                                                                                                             |
| Variable with multiple modes (e.g., light/dark)                    | Resolve to the currently active mode’s value. Display mode name in metadata.                                                                                                                                                                                     |
| Very large pages (50,000+ nodes)                                   | Show warning before scan. Suggest scoping to a selection for faster results. Show progress bar with cancel option.                                                                                                                                               |
| Plugin loses focus mid-scan                                        | Continue scan in background; results appear when user returns to the plugin panel.                                                                                                                                                                               |
| Figma API rate limits or timeouts                                  | Catch errors; show toast: “Scan interrupted. Try scoping to a smaller selection.” Auto-retry after a brief delay.                                                                                                                                                |
| User selects a single frame/section/group before scanning          | Scope the scan to that node and its children. Display scope indicator in the header. All counts, exports, and selection actions are limited to the scoped subtree.                                                                                               |
| User selects multiple nodes before scanning                        | Scope the scan to all selected nodes (each as a root). Header shows "N elements". Any node type is valid. Show a brief tooltip: “Tip: select a single frame, section, or group to scope your scan.”                                                              |
| User selects a leaf node (rectangle, text, vector) before scanning | Scope the scan to that node (and its descendants if it has children). Header shows the node name. Show same tooltip as above.                                                                                                                                    |
| User changes selection mid-scan                                    | Current scan continues with the original scope. Once complete, the plugin picks up the new scope if the selection is a valid frame/section/group.                                                                                                                |
| Scoped node is deleted after scan                                  | The plugin detects the deletion via documentchange, clears the scope, and automatically re-scans the full page. Toast: “Scoped element was deleted. Showing full-page results.”                                                                                  |
| Scoped scan followed by “Clear Scope”                              | Automatically triggers a full-page scan. Scope indicator resets to “Entire Page.”                                                                                                                                                                                |

# 10. Scope & Phasing

## 10.1 Phase 1 – MVP (v1.0)

Target: 6 weeks of development. Delivers all P0 requirements.

- Current-page scan: fills, strokes, text colors, across all layers on the active page

- Variable and style detection with resolved hex display

- Searchable, sortable color list with usage counts

- Token-bound vs. hard-coded filter toggle

- Click-to-select-all for any color on the current page

- Expand row to see individual elements; click to zoom-to-node

- Copy to clipboard: hex for solids, CSS gradient string for gradients

- Real-time live updates via documentchange listener—no manual re-scan needed

- Selection scoping: select one or more nodes (any type) to limit the audit to that scope; scope indicator and one-click clear; “Include vectors” as a persistent setting (Settings screen)

- Multi-select color rows via Shift+Click (contiguous range) and Cmd/Ctrl+Click (individual toggle) to select elements across multiple colors at once

- Zoom-to-selection using Figma’s native selection highlight and scrollAndZoomIntoView for visual confirmation; optional “Smooth zoom” in Settings

- Settings screen (Footer → Settings): Include vectors, Smooth zoom; persisted via clientStorage; Cancel/Done with discard-confirmation modal when leaving with unsaved changes

- Filter by node type (Text, Shape, Frame, Section, Group, Component, Instance, Vector) in addition to property type and binding

## 10.2 Phase 2 – Power Features (v1.1)

Target: 4 weeks post-MVP. Delivers P1 requirements.

- Effect color extraction (shadows, glows)

- Opacity/alpha as distinct metadata

- Group by property type, token collection, or page

- Summary statistics strip

- JSON and CSV export

- Persist scan results in session

## 10.3 Phase 3 – Advanced (v1.2+)

Target: Ongoing. Delivers P2 requirements and community-requested features.

- Multi-page scanning: extend scan across all pages in the document with aggregated results (evaluate based on community demand)

- Exclude hidden layers toggle

- Color diff: compare scans over time

- Batch replace: swap one color for another (or rebind to token) directly from the plugin

- Figma Dev Mode integration (if API allows)

# 11. Risks & Mitigations

| **Risk**                                                      | **Likelihood** | **Impact** | **Mitigation**                                                                                        |
| ------------------------------------------------------------- | -------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Figma API changes or deprecates variable/style access methods | Low            | High       | Pin to stable API version; abstract API calls behind an adapter layer for easy updates                |
| Performance degrades on extremely large pages (100K+ nodes)   | Medium         | High       | Chunked async traversal; selection-scoped scanning for large pages; Web Worker for UI-side processing |
| Users expect batch-replace functionality in v1.0              | High           | Medium     | Set clear expectations in the plugin description; position as a Phase 3 feature                       |
| Competing plugins release similar features                    | Medium         | Medium     | Differentiate on token detection depth, selection scoping, and multi-select; ship fast                |
| Variable API is read-only for bound variables on instances    | Low            | Medium     | Fall back to style detection; document known limitation                                               |

# 12. Open Questions

| **#** | **Question**                                                                                                                          | **Owner**        | **Status**                                                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| OQ-1  | Should we support scanning FigJam files, or scope to Design files only?                                                               | PM               | Resolved – Design files only for now                                                                                                 |
| OQ-2  | Is there demand for a “batch replace color” feature in Phase 1, or can it wait?                                                       | PM + Design Lead | Leaning Phase 3                                                                                                                      |
| OQ-3  | Should gradient colors be grouped under a single “gradient” entry or listed as individual stops?                                      | Design           | Resolved – single gradient entity, consistent with Figma’s model                                                                     |
| OQ-4  | Do we need to distinguish between local variables and library (published) variables?                                                  | Engineering      | Resolved – Yes. Show a small icon indicator (e.g., local vs. library) next to the token name. No additional text or labeling needed. |
| OQ-5  | What is the maximum practical file size we commit to supporting without degradation?                                                  | Engineering      | Needs benchmarking                                                                                                                   |
| OQ-6  | Should the plugin offer a “color palette” export (unique swatches only, no node data) for use in other tools?                         | PM               | Open – nice idea for Phase 2                                                                                                         |
| OQ-7  | When multiple frames/groups are selected, should we scan the union of all selected subtrees, or require a single selection?           | PM + Engineering | Resolved – Multi-selection supported; scope is the union of all selected nodes (any type). Header shows “N elements.”                |
| OQ-8  | Should multi-page scanning be revisited for Phase 3? If so, how should selection work given Figma’s single-page selection constraint? | PM + Engineering | Deferred – evaluate based on user feedback post-launch                                                                               |

# 13. Glossary

| **Term**         | **Definition**                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Resolved Color   | The final hex/RGBA value after evaluating any variable mode or style definition. What the user sees on screen.                                            |
| Design Token     | A named, reusable value (e.g., “primary/blue-600”) stored as a Figma Variable or Style. Maps to a CSS custom property or platform-specific token in code. |
| Hard-coded Color | A color value applied directly to a node’s fill, stroke, or text without referencing a Variable or Style. Also known as a “raw” or “detached” color.      |
| Bound Variable   | A Figma Variable that has been linked to a node’s property (e.g., fill). The node’s color changes when the variable’s value is updated.                   |
| Node             | Any element in a Figma file: frame, group, rectangle, text, vector, component, instance, etc.                                                             |
| Paint            | Figma’s representation of a color fill or stroke. Can be SolidPaint, GradientPaint, or ImagePaint.                                                        |

_**End of Document** — Color Inspector PRD v1.0. For questions, reach out to sarweshshah@yahoo.com_
