export const VERSION = '2.1';
export const HELP_URL = 'https://github.com/sarweshshah/color-me-good#readme';
export const CHANGELOG_URL =
  'https://github.com/sarweshshah/color-me-good/blob/master/CHANGELOG.md';

export const RESIZE_BOUNDS = {
  minWidth: 420,
  maxWidth: 540,
  minHeight: 720,
  maxHeight: 840,
} as const;

export const SHAPE_NODE_TYPES = new Set([
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'STAR',
  'POLYGON',
  'BOOLEAN_OPERATION',
]);
