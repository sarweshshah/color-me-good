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
} from './components/SearchFilterBar';
import { ColorList } from './components/ColorList';
import { Footer } from './components/Footer';
import { TooltipPortal } from './components/TooltipPortal';
import { Settings } from './components/Settings';
import { About } from './components/About';
import { ScanningState } from './components/ScanningState';
import { EmptyState } from './components/EmptyState';
import { AnimatedToast } from './components/AnimatedToast';
import { ViewPanel } from './components/ViewPanel';
import { ResizeHandles } from './components/ResizeHandles';
import { PanelHeader } from './components/ui/PanelHeader';
import { SerializedColorEntry, PropertyType } from '../shared/types';
import type { PluginSettings, UITheme } from '../shared/messages';
import { SHAPE_NODE_TYPES } from '../shared/constants';
import { matchesNodeFilters } from '../shared/filters';
import { flattenNodeRefBindings } from '../shared/nodeRefs';
import { formatResolvedColor } from './utils/format';
import { compareColorSort } from './utils/colorSort';

export function App() {
  const { state, postMessage } = usePluginMessages();
  const { selectedIds, handleClick } = useMultiSelect();

  const [view, setView] = useState<'list' | 'settings' | 'about'>('list');
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [bindingFilter, setBindingFilter] = useState<BindingFilter>('all');
  const [propertyFilters, setPropertyFilters] = useState<Set<PropertyType>>(new Set());
  const [nodeTypeFilters, setNodeTypeFilters] = useState<Set<string>>(new Set());
  const [hiddenOnlyFilter, setHiddenOnlyFilter] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('token');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const includeVectors = state.settings?.includeVectors ?? false;
  const colorDisplayFormat = state.settings?.colorDisplayFormat ?? 'hex';
  const uiTheme = state.settings?.uiTheme ?? 'system';
  const statusBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    postMessage({ type: 'ui-view-changed', view });
  }, [view, postMessage]);

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

  const handleOpenAbout = () => {
    setView('about');
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
    setHiddenOnlyFilter(false);
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
          if (nodeTypeFilters.has('Shape') && SHAPE_NODE_TYPES.has(type)) return true;
          return false;
        })
      );
    }

    if (hiddenOnlyFilter) {
      filtered = filtered.filter((c) =>
        c.nodes.some((n) => n.visible === false)
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
      case 'color':
        sorted.sort((a, b) =>
          compareColorSort(a, b, direction as 1 | -1)
        );
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
    hiddenOnlyFilter,
    sortBy,
    sortDirection,
    colorDisplayFormat,
  ]);

  const handleSelectAll = (color: SerializedColorEntry, event: MouseEvent) => {
    event.stopPropagation();
    const nodeIds = [
      ...new Set(
        color.nodes
          .filter((n) => matchesNodeFilters(n, propertyFilters, nodeTypeFilters, hiddenOnlyFilter))
          .map((n) => n.nodeId)
      ),
    ];
    const append = event.metaKey || event.ctrlKey;
    postMessage({ type: 'select-nodes', nodeIds, append });
  };

  const handleDetachVariable = (color: SerializedColorEntry, event: MouseEvent) => {
    event.stopPropagation();
    const bindings = color.nodes
      .filter((n) => matchesNodeFilters(n, propertyFilters, nodeTypeFilters, hiddenOnlyFilter))
      .flatMap((n) => flattenNodeRefBindings(n));
    postMessage({ type: 'detach-variable', bindings });
  };

  const handleRowClick = (color: SerializedColorEntry, event: MouseEvent) => {
    const allColorIds = filteredAndSortedColors.map((c) => c.dedupKey);
    handleClick(color.dedupKey, allColorIds, event);
  };

  const handleElementClick = (nodeId: string, event: MouseEvent) => {
    if (event.detail > 1) return;
    event.stopPropagation();
    if (event.metaKey || event.ctrlKey) {
      postMessage({ type: 'select-nodes', nodeIds: [nodeId], append: true, zoom: false });
      return;
    }
    postMessage({
      type: 'select-nodes',
      nodeIds: [nodeId],
      zoom: false,
      scrollIntoView: true,
    });
  };

  const handleElementDoubleClick = (nodeId: string, event: MouseEvent) => {
    event.stopPropagation();
    postMessage({ type: 'zoom-to-node', nodeId });
  };

  const handleCopySuccess = useCallback(() => {
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 1500);
  }, []);

  if (view === 'settings') {
    return (
      <div className="h-screen bg-figma-surface flex flex-col">
        <ResizeHandles postMessage={postMessage} />
        <ViewPanel className="flex flex-col flex-1 min-h-0">
          <PanelHeader title="Settings" onBack={() => setView('list')} />
          <Settings settings={state.settings} onSettingChange={handleSettingChange} />
        </ViewPanel>
        <Footer
          view="settings"
          onOpenSettings={handleOpenSettings}
          onOpenAbout={handleOpenAbout}
          onBack={() => setView('list')}
        />
        <TooltipPortal />
      </div>
    );
  }

  if (view === 'about') {
    return (
      <div className="h-screen bg-figma-surface flex flex-col">
        <ResizeHandles postMessage={postMessage} />
        <ViewPanel className="flex flex-col flex-1 min-h-0">
          <PanelHeader title="About" onBack={() => setView('list')} />
          <About />
        </ViewPanel>
        <Footer
          view="about"
          onOpenSettings={handleOpenSettings}
          onOpenAbout={handleOpenAbout}
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
    state.context && state.colors.length === 0 && !hasNoSelection && !state.isScanning;

  let mainContent;
  if (state.isScanning) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center">
        <ScanningState
          scanned={state.scanProgress?.scanned ?? 0}
          total={state.scanProgress?.total ?? 0}
          onCancel={() => postMessage({ type: 'cancel-scan' })}
        />
      </div>
    );
  } else if (state.error) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center px-6">
          <div className="text-figma-orange text-sm mb-2">Error</div>
          <div className="text-figma-text-secondary text-xs">{state.error}</div>
        </div>
      </div>
    );
  } else if (hasNoSelection) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          title="Select elements to scan"
          description="Select one or more elements in the canvas. Colors from your selection will appear here."
        />
      </div>
    );
  } else if (hasSelectionButNoColors) {
    mainContent = (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          title="No colors found in selection"
          description="Try selecting different elements or expanding the selection."
        />
      </div>
    );
  } else {
    mainContent = (
      <div className="flex-1 min-h-0 flex flex-col relative z-0">
        <ColorList
          entranceKey={state.colors.map((c) => c.dedupKey).join('|')}
          colors={filteredAndSortedColors}
          selectedIds={selectedIds}
          propertyFilters={propertyFilters}
          nodeTypeFilters={nodeTypeFilters}
          hiddenOnlyFilter={hiddenOnlyFilter}
          colorDisplayFormat={colorDisplayFormat}
          onSelectAll={handleSelectAll}
          onDetachVariable={handleDetachVariable}
          onRowClick={handleRowClick}
          onElementClick={handleElementClick}
          onElementDoubleClick={handleElementDoubleClick}
          onCopySuccess={handleCopySuccess}
        />
      </div>
    );
  }

  return (
    <div className="h-screen bg-figma-bg flex flex-col overflow-hidden">
      <div className="app-chrome shrink-0 relative z-20 bg-figma-bg">
        <Header context={state.context} onClearScope={handleClearScope} />
        <SummaryStrip
          colors={state.colors}
          bindingFilter={bindingFilter}
          onBindingFilterChange={setBindingFilter}
        />
        <SearchFilterBar
          searchText={searchText}
          onSearchChange={setSearchText}
          propertyFilters={propertyFilters}
          onPropertyFilterToggle={handlePropertyFilterToggle}
          nodeTypeFilters={nodeTypeFilters}
          onNodeTypeFilterToggle={handleNodeTypeFilterToggle}
          hiddenOnlyFilter={hiddenOnlyFilter}
          onHiddenOnlyFilterToggle={() => setHiddenOnlyFilter((v) => !v)}
          onClearFilters={handleClearFilters}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
          includeVectors={includeVectors}
        />
      </div>

      {mainContent}

      <div className="relative shrink-0 isolate">
        {showCopiedToast && (
          <AnimatedToast message="Copied!" footerRef={statusBarRef} />
        )}
        <div ref={statusBarRef} className="relative z-20 bg-figma-bg">
          <Footer view="list" onOpenSettings={handleOpenSettings} onOpenAbout={handleOpenAbout} onBack={() => {}} />
        </div>
      </div>
      <ResizeHandles postMessage={postMessage} />
      <TooltipPortal />
    </div>
  );
}
