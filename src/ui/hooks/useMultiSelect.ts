import { useState, useCallback } from 'preact/hooks';

export function useMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);

  const handleClick = useCallback(
    (id: string, allIds: string[], event: MouseEvent) => {
      if (event.shiftKey && lastClickedId) {
        const lastIndex = allIds.indexOf(lastClickedId);
        const currentIndex = allIds.indexOf(id);
        
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = allIds.slice(start, end + 1);
          
          setSelectedIds(new Set(rangeIds));
        }
      } else if (event.metaKey || event.ctrlKey) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return next;
        });
      } else {
        setSelectedIds(new Set([id]));
      }
      
      setLastClickedId(id);
    },
    [lastClickedId]
  );

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedId(null);
  }, []);

  return {
    selectedIds,
    handleClick,
    clearSelection,
  };
}
