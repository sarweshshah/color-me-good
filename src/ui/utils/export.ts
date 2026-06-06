import type { SerializedColorEntry, ScanContext } from '../../shared/types';
import type { ColorDisplayFormat } from '../../shared/messages';
import { formatResolvedColor } from './format';

export type ExportFormat = 'json' | 'csv' | 'clipboard';

interface ExportPayload {
  colors: SerializedColorEntry[];
  context: ScanContext | null;
  colorDisplayFormat: ColorDisplayFormat;
}

function buildJSONExport({ colors, context, colorDisplayFormat }: ExportPayload): string {
  const data = {
    exportedAt: new Date().toISOString(),
    scope: context
      ? {
          mode: context.mode,
          scopeNodeName: context.scopeNodeName,
          totalNodesScanned: context.totalNodesScanned,
        }
      : null,
    summary: {
      totalColors: colors.length,
      tokenBound: colors.filter((c) => c.isTokenBound).length,
      hardCoded: colors.filter((c) => !c.isTokenBound).length,
      totalUsages: colors.reduce((sum, c) => sum + c.usageCount, 0),
    },
    colors: colors.map((c) => ({
      type: c.type,
      hex: c.hex,
      rgba: c.rgba,
      displayValue: formatResolvedColor(c, colorDisplayFormat),
      gradient: c.gradient,
      tokenName: c.tokenName,
      tokenCollection: c.tokenCollection,
      libraryName: c.libraryName,
      isLibraryVariable: c.isLibraryVariable,
      styleName: c.styleName,
      isTokenBound: c.isTokenBound,
      usageCount: c.usageCount,
      properties: c.propertyTypes,
      nodes: c.nodes.map((n) => ({
        nodeId: n.nodeId,
        nodeName: n.nodeName,
        nodeType: n.nodeType,
        layerPath: n.layerPath,
        property: n.propertyType,
        visible: n.visible,
      })),
    })),
  };
  return JSON.stringify(data, null, 2);
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildCSVExport({ colors, colorDisplayFormat }: ExportPayload): string {
  const headers = [
    'Color',
    'Type',
    'Display Value',
    'Token Name',
    'Token Collection',
    'Library',
    'Style Name',
    'Bound',
    'Usage Count',
    'Properties',
    'Node Names',
  ];

  const rows = colors.map((c) => [
    c.hex ?? '',
    c.type,
    formatResolvedColor(c, colorDisplayFormat),
    c.tokenName ?? '',
    c.tokenCollection ?? '',
    c.libraryName ?? '',
    c.styleName ?? '',
    c.isTokenBound ? 'Yes' : 'No',
    String(c.usageCount),
    c.propertyTypes.join('; '),
    c.nodes.map((n) => n.nodeName).join('; '),
  ]);

  const csvLines = [
    headers.map(escapeCSVField).join(','),
    ...rows.map((row) => row.map(escapeCSVField).join(',')),
  ];
  return csvLines.join('\n');
}

function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
  return sanitized || 'selection';
}

function buildExportFilename(
  context: ScanContext | null,
  extension: 'json' | 'csv'
): string {
  const layerName = context?.scopeNodeName
    ? sanitizeFilename(context.scopeNodeName)
    : 'selection';
  return `colors-${layerName}.${extension}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportColors(format: ExportFormat, payload: ExportPayload) {
  if (format === 'json') {
    const content = buildJSONExport(payload);
    downloadFile(
      content,
      buildExportFilename(payload.context, 'json'),
      'application/json'
    );
  } else {
    const content = buildCSVExport(payload);
    downloadFile(
      content,
      buildExportFilename(payload.context, 'csv'),
      'text/csv'
    );
  }
}
