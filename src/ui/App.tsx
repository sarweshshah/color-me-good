import { useState, useMemo, useCallback, useRef, useEffect } from 'preact/hooks';
import { usePluginMessages } from './hooks/usePluginMessages';
import { useMultiSelect } from './hooks/useMultiSelect';
import { Header } from './components/Header';
import { SummaryStrip } from './components/SummaryStrip';
import {
  SearchFilterBar,
  BindingFilter,
  SortOption,
  SHAPE_NODE_TYPES,
} from './components/SearchFilterBar';
import { ColorList } from './components/ColorList';
import { Footer } from './components/Footer';
import { Settings } from './components/Settings';
import { SerializedColorEntry, PropertyType } from '../shared/types';
import type { PluginSettings } from '../shared/messages';

const MIN_WIDTH = 360;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 750;
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
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
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

function ConfirmDiscardModal({
  onKeepEditing,
  onDiscard,
}: {
  onKeepEditing: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[10000]"
      onClick={(e) => e.target === e.currentTarget && onKeepEditing()}
    >
      <div
        className="bg-figma-surface border border-figma-border rounded-lg shadow-lg p-4 max-w-[280px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-medium text-figma-text mb-1">Discard changes?</div>
        <div className="text-xs text-figma-text-secondary mb-4">
          Your changes will not be saved.
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-1.5 text-xs text-figma-text-secondary hover:text-figma-text border border-figma-border rounded hover:bg-figma-bg"
            onClick={onKeepEditing}
          >
            Keep editing
          </button>
          <button
            className="px-3 py-1.5 text-xs text-white bg-neutral-600 hover:bg-neutral-700 rounded"
            onClick={onDiscard}
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

function ResizeHandles({ postMessage }: { postMessage: (msg: any) => void }) {
  const corner = useResize(postMessage, 'corner');
  const right = useResize(postMessage, 'right');
  const bottom = useResize(postMessage, 'bottom');

  const z = { zIndex: 9999 };
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
          bottom: 20,
          width: 10,
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
          right: 20,
          height: 10,
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
  const [settingsDraft, setSettingsDraft] = useState<PluginSettings | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const initialSettingsRef = useRef<PluginSettings | null>(null);

  const [searchText, setSearchText] = useState('');
  const [bindingFilter, setBindingFilter] = useState<BindingFilter>('all');
  const [propertyFilters, setPropertyFilters] = useState<Set<PropertyType>>(new Set());
  const [nodeTypeFilters, setNodeTypeFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('usage');

  const includeVectors = state.settings?.includeVectors ?? false;

  // Sync draft when entering settings or when settings load after open
  useEffect(() => {
    if (view !== 'settings') return;
    if (!state.settings) return;
    if (settingsDraft === null) {
      initialSettingsRef.current = { ...state.settings };
      setSettingsDraft({ ...state.settings });
    }
  }, [view, state.settings, settingsDraft === null]);

  const handleOpenSettings = () => {
    const s = state.settings;
    initialSettingsRef.current = s ? { ...s } : null;
    setSettingsDraft(s ? { ...s } : null);
    setView('settings');
  };

  const handleSettingsDraftChange = (key: keyof PluginSettings, value: boolean) => {
    setSettingsDraft((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const hasSettingsChanges =
    settingsDraft &&
    initialSettingsRef.current &&
    (settingsDraft.includeVectors !== initialSettingsRef.current.includeVectors ||
      settingsDraft.smoothZoom !== initialSettingsRef.current.smoothZoom);

  const handleSettingsDone = () => {
    if (settingsDraft) {
      postMessage({ type: 'set-setting', key: 'includeVectors', value: settingsDraft.includeVectors });
      postMessage({ type: 'set-setting', key: 'smoothZoom', value: settingsDraft.smoothZoom });
    }
    setView('list');
  };

  const handleSettingsCancel = () => {
    if (hasSettingsChanges) {
      setShowDiscardModal(true);
    } else {
      setView('list');
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    setView('list');
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

    if (nodeTypeFilters.size > 0) {
      filtered = filtered.filter((c) =>
        c.nodes.some((n) => {
          const type = n.nodeType;
          if (!type) return false;
          if (nodeTypeFilters.has(type)) return true;
          if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.includes(type)) return true;
          return false;
        })
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
  }, [state.colors, searchText, bindingFilter, propertyFilters, nodeTypeFilters, sortBy]);

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
        <ResizeHandles postMessage={postMessage} />
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
        <div className="text-center px-6">
          <div className="text-figma-orange text-sm mb-2">Error</div>
          <div className="text-figma-text-secondary text-xs">{state.error}</div>
        </div>
      </div>
    );
  }

  if (view === 'settings') {
    return (
      <div className="h-screen bg-figma-bg flex flex-col">
        <ResizeHandles postMessage={postMessage} />
        <div className="px-4 py-3 border-b border-figma-border">
          <h1 className="text-sm font-semibold text-figma-text">Settings</h1>
        </div>
        <Settings
          settings={settingsDraft}
          onSettingChange={handleSettingsDraftChange}
        />
        <Footer
          view="settings"
          onOpenSettings={handleOpenSettings}
          onBack={handleSettingsDone}
          onCancel={handleSettingsCancel}
        />
        {showDiscardModal && (
          <ConfirmDiscardModal
            onKeepEditing={() => setShowDiscardModal(false)}
            onDiscard={handleConfirmDiscard}
          />
        )}
      </div>
    );
  }

  if (!state.context || state.colors.length === 0) {
    return (
      <div className="h-screen bg-figma-bg flex flex-col">
        <ResizeHandles postMessage={postMessage} />
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
        <Footer
          view="list"
          onOpenSettings={handleOpenSettings}
          onBack={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-figma-bg flex flex-col overflow-hidden">
      <ResizeHandles postMessage={postMessage} />
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
        onSortChange={setSortBy}
        includeVectors={includeVectors}
        nodeTypeFilters={nodeTypeFilters}
        onNodeTypeFilterToggle={handleNodeTypeFilterToggle}
      />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <ColorList
          colors={filteredAndSortedColors}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onRowClick={handleRowClick}
          onElementClick={handleElementClick}
        />
      </div>

      <Footer view="list" onOpenSettings={handleOpenSettings} onBack={() => {}} />
    </div>
  );
}
