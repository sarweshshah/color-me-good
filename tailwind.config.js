/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'figma-bg': '#2c2c2c',
        'figma-surface': '#383838',
        'figma-border': '#4d4d4d',
        'figma-text': '#ffffff',
        'figma-text-secondary': '#b3b3b3',
        'figma-blue': '#18a0fb',
        'figma-green': '#1bc47d',
        'figma-orange': '#ff9500',
      },
    },
  },
  plugins: [],
};
