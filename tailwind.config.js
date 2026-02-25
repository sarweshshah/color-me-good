/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '!./src/node_modules/**',
  ],
  theme: {
    extend: {
      colors: {
        'figma-bg': '#f5f5f5',
        'figma-surface': '#ffffff',
        'figma-border': '#e0e0e0',
        'figma-text': '#1e1e1e',
        'figma-text-secondary': '#6b6b6b',
        'figma-blue': '#0d6efd',
        'figma-green': '#14a361',
        'figma-orange': '#e67700',
      },
    },
  },
  plugins: [],
};
