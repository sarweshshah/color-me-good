import { useState, useMemo, useCallback, useRef } from 'preact/hooks';
import { usePluginMessages } from './hooks/usePluginMessages';
import { useMultiSelect } from './hooks/useMultiSelect';
import { Header } from './components/Header';
import { SummaryStrip } from './components/SummaryStrip';
import { SearchFilterBar, BindingFilter, SortOption } from './components/SearchFilterBar';
import { ColorList } from './components/ColorList';
import { Footer } from './components/Footer';
import { SerializedColorEntry, PropertyType } from '../shared/types';

const MIN_WIDTH = 360;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 560;
const MAX_HEIGHT = 840;

function ResizeHandle({ postMessage }: { postMessage: (msg: any) => void }) {
  const dragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startSize = useRef({ w: 0, h: 0 });

  const onPointerDown = useCallback((e: PointerEvent) => {
    dragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startSize.current = {
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    const newW = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startSize.current.w + dx));
    const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startSize.current.h + dy));
    postMessage({ type: 'resize', width: Math.round(newW), height: Math.round(newH) });
  }, [postMessage]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        width: '16px',
        height: '16px',
        cursor: 'nwse-resize',
        zIndex: 9999,
      }}
    />
  );
}

export function App() {
  const { state, postMessage } = usePluginMessages();
  const { selectedIds, handleClick } = useMultiSelect();

  const [searchText, setSearchText] = useState('');
  const [bindingFilter, setBindingFilter] = useState<BindingFilter>('all');
  const [propertyFilters, setPropertyFilters] = useState<Set<PropertyType>>(
    new Set()
  );
  const [sortBy, setSortBy] = useState<SortOption>('usage');
  const [includeVectors, setIncludeVectors] = useState(false);

  const handleIncludeVectorsChange = (include: boolean) => {
    setIncludeVectors(include);
    postMessage({ type: 'set-include-vectors', includeVectors: include });
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

  const handleClearFilters = () => {
    setSearchText('');
    setBindingFilter('all');
    setPropertyFilters(new Set());
    if (includeVectors) {
      setIncludeVectors(false);
      postMessage({ type: 'set-include-vectors', includeVectors: false });
    }
  };

  const filteredAndSortedColors = useMemo(() => {
    let filtered = state.colors;

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.hex?.toLowerCase().includes(search) ||
          c.tokenName?.toLowerCase().includes(search) ||
          c.styleName?.toLowerCase().includes(search)
      );
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

    const sorted = [...filtered];
    switch (sortBy) {
      case 'usage':
        sorted.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'hex':
        sorted.sort((a, b) => {
          const aHex = a.hex || '';
          const bHex = b.hex || '';
          return aHex.localeCompare(bHex);
        });
        break;
      case 'token':
        sorted.sort((a, b) => {
          const aName = a.tokenName || a.hex || '';
          const bName = b.tokenName || b.hex || '';
          return aName.localeCompare(bName);
        });
        break;
    }

    return sorted;
  }, [state.colors, searchText, bindingFilter, propertyFilters, sortBy]);

  const handleSelectAll = (color: SerializedColorEntry, event: MouseEvent) => {
    event.stopPropagation();
    const nodeIds = color.nodes.map((n) => n.nodeId);
    postMessage({ type: 'select-nodes', nodeIds });
  };

  const handleRowClick = (color: SerializedColorEntry, event: MouseEvent) => {
    const allColorIds = filteredAndSortedColors.map((c) => c.dedupKey);
    handleClick(color.dedupKey, allColorIds, event);
  };

  const handleElementClick = (nodeId: string) => {
    postMessage({ type: 'zoom-to-node', nodeId });
  };

  if (state.isScanning) {
    return (
      <div className="h-screen bg-figma-bg flex items-center justify-center">
        <ResizeHandle postMessage={postMessage} />
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
        <ResizeHandle postMessage={postMessage} />
        <div className="text-center px-6">
          <div className="text-figma-orange text-sm mb-2">Error</div>
          <div className="text-figma-text-secondary text-xs">{state.error}</div>
        </div>
      </div>
    );
  }

  if (!state.context || state.colors.length === 0) {
    return (
      <div className="h-screen bg-figma-bg flex flex-col">
        <ResizeHandle postMessage={postMessage} />
        <Header context={state.context} onClearScope={handleClearScope} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-figma-text-secondary text-sm">
              No colors found on this page.
            </div>
            <div className="text-figma-text-secondary text-xs mt-1">
              Add some elements and they will appear automatically.
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="h-screen bg-figma-bg flex flex-col">
      <ResizeHandle postMessage={postMessage} />
      <Header context={state.context} onClearScope={handleClearScope} />
      <SummaryStrip
        colors={state.colors}
        totalNodesScanned={state.context.totalNodesScanned}
      />
      <SearchFilterBar
        searchText={searchText}
        onSearchChange={setSearchText}
        bindingFilter={bindingFilter}
        onBindingFilterChange={setBindingFilter}
        propertyFilters={propertyFilters}
        onPropertyFilterToggle={handlePropertyFilterToggle}
        onClearFilters={handleClearFilters}
        sortBy={sortBy}
        onSortChange={setSortBy}
        includeVectors={includeVectors}
        onIncludeVectorsChange={handleIncludeVectorsChange}
      />

      <ColorList
        colors={filteredAndSortedColors}
        selectedIds={selectedIds}
        onSelectAll={handleSelectAll}
        onRowClick={handleRowClick}
        onElementClick={handleElementClick}
      />

      <Footer />
    </div>
  );
}
