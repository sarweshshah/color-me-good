export type BindingFilter = 'all' | 'token-bound' | 'hard-coded';
export type SortOption = 'usage' | 'color' | 'token';
export type SortDirection = 'asc' | 'desc';

export const SORT_LABELS: Record<SortOption, string> = {
  usage: 'Usage Count',
  color: 'Color',
  token: 'Token Name',
};

export const SORT_OPTIONS: SortOption[] = ['token', 'usage', 'color'];
