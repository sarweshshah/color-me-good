import { useEffect, useState } from 'preact/hooks';
import { PluginMessage, UIMessage } from '../../shared/messages';
import { SerializedColorEntry, ScanContext } from '../../shared/types';

export interface PluginState {
  colors: SerializedColorEntry[];
  context: ScanContext | null;
  isScanning: boolean;
  scanProgress: { scanned: number; total: number } | null;
  error: string | null;
}

export function usePluginMessages() {
  const [state, setState] = useState<PluginState>({
    colors: [],
    context: null,
    isScanning: false,
    scanProgress: null,
    error: null,
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data.pluginMessage as PluginMessage;
      if (!msg) return;

      switch (msg.type) {
        case 'scan-progress':
          setState((prev) => ({
            ...prev,
            isScanning: true,
            scanProgress: { scanned: msg.scanned, total: msg.total },
            error: null,
          }));
          break;

        case 'scan-complete':
          setState((prev) => ({
            ...prev,
            colors: msg.colors,
            context: msg.context,
            isScanning: false,
            scanProgress: null,
            error: null,
          }));
          break;

        case 'scan-error':
          setState((prev) => ({
            ...prev,
            isScanning: false,
            scanProgress: null,
            error: msg.message,
          }));
          break;

        case 'scope-changed':
          setState((prev) => ({
            ...prev,
            context: msg.context,
          }));
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const postMessage = (msg: UIMessage) => {
    parent.postMessage({ pluginMessage: msg }, '*');
  };

  return { state, postMessage };
}
