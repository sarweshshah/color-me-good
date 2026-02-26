/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}', '!./src/node_modules/**'],
  theme: {
    extend: {
      colors: {
        'figma-bg': 'var(--figma-color-bg-secondary, #f5f5f5)',
        'figma-bg-hover': 'var(--figma-color-bg-hover, #ebebeb)',
        'figma-surface': 'var(--figma-color-bg, #ffffff)',
        'figma-border': 'var(--figma-color-border, #e0e0e0)',
        'figma-border-strong': 'var(--figma-color-border-strong, #e2e2e2)',
        'figma-bg-selected': 'var(--figma-color-bg-selected, #e5f4ff)',
        'figma-icon': 'var(--figma-color-icon, #1e1e1e)',
        'figma-text': 'var(--figma-color-text, #1e1e1e)',
        'figma-text-secondary': 'var(--figma-color-text-secondary, #6b6b6b)',
        'figma-text-tertiary': 'var(--figma-color-text-tertiary, #0000004d)',
        'figma-blue': 'var(--figma-color-text-brand, #0d6efd)',
        'figma-brand': 'var(--figma-color-bg-brand, #0d99ff)',
        'figma-onbrand': 'var(--figma-color-text-onbrand, #ffffff)',
        'figma-green': 'var(--figma-color-bg-success, #14a361)',
        'figma-onsuccess': 'var(--figma-color-text-onsuccess, #ffffff)',
        'figma-orange': 'var(--figma-color-bg-warning, #e67700)',
        'figma-onwarning': 'var(--figma-color-text-onwarning, #1e1e1e)',
      },
    },
  },
  plugins: [],
};
