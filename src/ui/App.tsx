import { useState, useMemo, useCallback, useRef, useEffect } from 'preact/hooks';
import { usePluginMessages } from './hooks/usePluginMessages';
import { useMultiSelect } from './hooks/useMultiSelect';
import { Header } from './components/Header';
import { SummaryStrip } from './components/SummaryStrip';
import {
  SearchFilterBar,
  BindingFilter,
  SortOption,
  SortDirection,
  SHAPE_NODE_TYPES,
} from './components/SearchFilterBar';
import { ColorList } from './components/ColorList';
import { Footer } from './components/Footer';
import { TooltipPortal } from './components/TooltipPortal';
import { Settings } from './components/Settings';
import { ChevronLeft, MousePointerClick } from 'lucide-preact';
import { SerializedColorEntry, PropertyType } from '../shared/types';
import type { PluginSettings, UITheme } from '../shared/messages';
import { formatResolvedColor } from './utils/format';

const MIN_WIDTH = 420;
const MAX_WIDTH = 540;
const MIN_HEIGHT = 720;
const MAX_HEIGHT = 840;

type ResizeMode = 'corner' | 'right' | 'bottom';

function useResize(postMessage: (msg: any) => void, mode: ResizeMode) {
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ w: 0, h: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = {
      w: window.innerWidth,
      h: window.innerHeight,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      let newW = startSize.current.w;
      let newH = startSize.current.h;
      if (mode === 'corner' || mode === 'right')
        newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.w + dx));
      if (mode === 'corner' || mode === 'bottom')
        newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startSize.current.h + dy));
      postMessage({ type: 'resize', width: Math.round(newW), height: Math.round(newH) });
    },
    [postMessage, mode]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

function ResizeHandles({ postMessage }: { postMessage: (msg: any) => void }) {
  const corner = useResize(postMessage, 'corner');
  const right = useResize(postMessage, 'right');
  const bottom = useResize(postMessage, 'bottom');

  const z = { zIndex: 10002 };
  return (
    <>
      <div
        onPointerDown={corner.onPointerDown}
        onPointerMove={corner.onPointerMove}
        onPointerUp={corner.onPointerUp}
        style={{
          position: 'fixed',
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: 'nwse-resize',
          ...z,
        }}
      />
      <div
        onPointerDown={right.onPointerDown}
        onPointerMove={right.onPointerMove}
        onPointerUp={right.onPointerUp}
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          bottom: 12,
          width: 4,
          cursor: 'ew-resize',
          ...z,
        }}
      />
      <div
        onPointerDown={bottom.onPointerDown}
        onPointerMove={bottom.onPointerMove}
        onPointerUp={bottom.onPointerUp}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 12,
          height: 4,
          cursor: 'ns-resize',
          ...z,
        }}
      />
    </>
  );
}

export function App() {
  const { state, postMessage } = usePluginMessages();
  const { selectedIds, handleClick } = useMultiSelect();

  const [view, setView] = useState<'list' | 'settings'>('list');
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [bindingFilter, setBindingFilter] = useState<BindingFilter>('all');
  const [propertyFilters, setPropertyFilters] = useState<Set<PropertyType>>(new Set());
  const [nodeTypeFilters, setNodeTypeFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('usage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const includeVectors = state.settings?.includeVectors ?? false;
  const colorDisplayFormat = state.settings?.colorDisplayFormat ?? 'hex';
  const uiTheme = state.settings?.uiTheme ?? 'system';

  useEffect(() => {
    const applyTheme = (theme: UITheme) => {
      const resolved =
        theme === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'figma-dark'
            : 'figma-light'
          : theme === 'dark'
            ? 'figma-dark'
            : 'figma-light';
      document.documentElement.className = resolved;
    };

    applyTheme(uiTheme);

    if (uiTheme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('system');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [uiTheme]);

  const handleOpenSettings = () => {
    setView('settings');
  };

  const handleSettingChange = <K extends keyof PluginSettings>(
    key: K,
    value: PluginSettings[K]
  ) => {
    postMessage({ type: 'set-setting', key, value });
  };

  const handleClearScope = () => {
    postMessage({ type: 'clear-scope' });
  };

  const handlePropertyFilterToggle = (property: PropertyType) => {
    setPropertyFilters((prev) => {
      const next = new Set(prev);
      if (next.has(property)) {
        next.delete(property);
      } else {
        next.add(property);
      }
      return next;
    });
  };

  const handleNodeTypeFilterToggle = (nodeType: string) => {
    setNodeTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(nodeType)) next.delete(nodeType);
      else next.add(nodeType);
      return next;
    });
  };

  const handleClearFilters = () => {
    setSearchText('');
    setBindingFilter('all');
    setPropertyFilters(new Set());
    setNodeTypeFilters(new Set());
  };

  const handleSortChange = (nextSortBy: SortOption) => {
    if (nextSortBy === sortBy) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(nextSortBy);
    setSortDirection(nextSortBy === 'usage' ? 'desc' : 'asc');
  };

  const filteredAndSortedColors = useMemo(() => {
    let filtered = state.colors;

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((c) => {
        const formatted = formatResolvedColor(c, colorDisplayFormat);
        return (
          c.tokenName?.toLowerCase().includes(search) ||
          c.styleName?.toLowerCase().includes(search) ||
          formatted.toLowerCase().includes(search)
        );
      });
    }

    if (bindingFilter === 'token-bound') {
      filtered = filtered.filter((c) => c.isTokenBound);
    } else if (bindingFilter === 'hard-coded') {
      filtered = filtered.filter((c) => !c.isTokenBound);
    }

    if (propertyFilters.size > 0) {
      filtered = filtered.filter((c) =>
        c.propertyTypes.some((pt) => propertyFilters.has(pt))
      );
    }

    if (nodeTypeFilters.size > 0) {
      filtered = filtered.filter((c) =>
        c.nodes.some((n) => {
          const type = n.nodeType;
          if (!type) return false;
          if (nodeTypeFilters.has(type)) return true;
          if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.includes(type))
            return true;
          return false;
        })
      );
    }

    const sorted = [...filtered];
    const direction = sortDirection === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'usage':
        sorted.sort((a, b) => {
          const usageDiff = a.usageCount - b.usageCount;
          if (usageDiff !== 0) return usageDiff * direction;
          return a.dedupKey.localeCompare(b.dedupKey) * direction;
        });
        break;
      case 'hex':
        sorted.sort((a, b) => {
          const aHex = a.hex || '';
          const bHex = b.hex || '';
          const hexDiff = aHex.localeCompare(bHex);
          if (hexDiff !== 0) return hexDiff * direction;
          return a.dedupKey.localeCompare(b.dedupKey) * direction;
        });
        break;
      case 'token':
        sorted.sort((a, b) => {
          const aName = a.tokenName || a.hex || '';
          const bName = b.tokenName || b.hex || '';
          const tokenDiff = aName.localeCompare(bName);
          if (tokenDiff !== 0) return tokenDiff * direction;
          return a.dedupKey.localeCompare(b.dedupKey) * direction;
        });
        break;
    }

    return sorted;
  }, [
    state.colors,
    searchText,
    bindingFilter,
    propertyFilters,
    nodeTypeFilters,
    sortBy,
    sortDirection,
    colorDisplayFormat,
  ]);

  const handleSelectAll = (color: SerializedColorEntry, event: MouseEvent) => {
    event.stopPropagation();
    const nodes = color.nodes.filter((n) => {
      if (propertyFilters.size > 0 && !propertyFilters.has(n.propertyType)) return false;
      if (nodeTypeFilters.size > 0) {
        const type = n.nodeType;
        if (!type) return false;
        if (nodeTypeFilters.has(type)) return true;
        if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.includes(type)) return true;
        return false;
      }
      return true;
    });
    const nodeIds = nodes.map((n) => n.nodeId);
    postMessage({ type: 'select-nodes', nodeIds });
  };

  const handleRowClick = (color: SerializedColorEntry, event: MouseEvent) => {
    const allColorIds = filteredAndSortedColors.map((c) => c.dedupKey);
    handleClick(color.dedupKey, allColorIds, event);
  };

  const handleElementClick = (nodeId: string) => {
    postMessage({ type: 'zoom-to-node', nodeId });
  };

  const handleCopySuccess = useCallback(() => {
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 1500);
  }, []);

  if (state.isScanning) {
    return (
      <div className="h-screen bg-figma-bg flex items-center justify-center">
        <ResizeHandles postMessage={postMessage} />
        <TooltipPortal />
        <div className="text-center">
          <div className="text-figma-text text-sm mb-2">Scanning...</div>
          {state.scanProgress && (
            <div className="text-figma-text-secondary text-xs">
              {state.scanProgress.scanned.toLocaleString()} /{' '}
              {state.scanProgress.total.toLocaleString()} nodes
            </div>
          )}
          <div className="w-48 h-1 bg-figma-border rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-figma-blue transition-all duration-200"
              style={{
                width: state.scanProgress
                  ? `${(state.scanProgress.scanned / state.scanProgress.total) * 100}%`
                  : '0%',
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="h-screen bg-figma-bg flex items-center justify-center">
        <ResizeHandles postMessage={postMessage} />
        <TooltipPortal />
        <div className="text-center px-6">
          <div className="text-figma-orange text-sm mb-2">Error</div>
          <div className="text-figma-text-secondary text-xs">{state.error}</div>
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="h-screen bg-figma-surface flex flex-col">
        <ResizeHandles postMessage={postMessage} />
        <div className="px-4 py-3 border-b border-figma-border flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView('list')}
            className="p-1 -ml-1 rounded text-figma-text-secondary hover:text-figma-text hover:bg-figma-bg-hover active:bg-figma-border transition-colors"
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold text-figma-text">Settings</h1>
        </div>
        <Settings settings={state.settings} onSettingChange={handleSettingChange} />
        <Footer
          view="settings"
          onOpenSettings={handleOpenSettings}
          onBack={() => setView('list')}
        />
        <TooltipPortal />
      </div>
    );
  }

  const hasNoSelection =
    (state.context == null ||
      (state.context.mode === 'selection' &&
        (state.context.scopeNodeIds == null ||
          state.context.scopeNodeIds.length === 0))) &&
    state.colors.length === 0 &&
    !state.isScanning;

  const hasSelectionButNoColors =
    state.context && state.colors.length === 0 && !hasNoSelection;

  if (hasNoSelection) {
    return (
      <div className="h-screen bg-figma-bg flex flex-col">
        <ResizeHandles postMessage={postMessage} />
        <Header context={state.context} onClearScope={handleClearScope} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6 max-w-[320px]">
            <div className="flex justify-center mb-2 text-figma-text-tertiary non-scanned-state-icon">
              <MousePointerClick
                size={48}
                strokeWidth={1.5}
                className="text-figma-text-tertiary"
              />
            </div>
            <div className="text-figma-text text-sm font-medium mb-1">
              Select elements to scan
            </div>
            <div className="text-figma-text-secondary text-xs leading-relaxed">
              Select one or more elements in the canvas. Colors from your selection will
              appear here.
            </div>
          </div>
        </div>
        <Footer view="list" onOpenSettings={handleOpenSettings} onBack={() => {}} />
        <TooltipPortal />
      </div>
    );
  }

  if (hasSelectionButNoColors) {
    return (
      <div className="h-screen bg-figma-bg flex flex-col">
        <ResizeHandles postMessage={postMessage} />
        <Header context={state.context} onClearScope={handleClearScope} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-figma-text-secondary text-sm">
              No colors found in selection.
            </div>
            <div className="text-figma-text-secondary text-xs mt-1">
              Try selecting different elements or expanding the selection.
            </div>
          </div>
        </div>
        <Footer view="list" onOpenSettings={handleOpenSettings} onBack={() => {}} />
        <TooltipPortal />
      </div>
    );
  }

  return (
    <div className="h-screen bg-figma-bg flex flex-col overflow-hidden">
      <div className="shrink-0">
        <Header context={state.context} onClearScope={handleClearScope} />
      </div>
      <div className="shrink-0">
        <SummaryStrip
          colors={state.colors}
          bindingFilter={bindingFilter}
          onBindingFilterChange={setBindingFilter}
        />
      </div>
      <div className="shrink-0">
        <SearchFilterBar
          searchText={searchText}
          onSearchChange={setSearchText}
          propertyFilters={propertyFilters}
          onPropertyFilterToggle={handlePropertyFilterToggle}
          onClearFilters={handleClearFilters}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          includeVectors={includeVectors}
          nodeTypeFilters={nodeTypeFilters}
          onNodeTypeFilterToggle={handleNodeTypeFilterToggle}
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col relative z-10">
        <ColorList
          colors={filteredAndSortedColors}
          selectedIds={selectedIds}
          propertyFilters={propertyFilters}
          nodeTypeFilters={nodeTypeFilters}
          colorDisplayFormat={colorDisplayFormat}
          onSelectAll={handleSelectAll}
          onRowClick={handleRowClick}
          onElementClick={handleElementClick}
          onCopySuccess={handleCopySuccess}
        />
      </div>

      {showCopiedToast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 bottom-14 z-[10001] bg-figma-green text-figma-onsuccess text-xs font-medium px-4 py-2 rounded shadow-lg"
          role="status"
          aria-live="polite"
        >
          Copied!
        </div>
      )}

      <Footer view="list" onOpenSettings={handleOpenSettings} onBack={() => {}} />
      <ResizeHandles postMessage={postMessage} />
      <TooltipPortal />
    </div>
  );
}
