import preact from '@preact/preset-vite';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2017',
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: '',
    assetsInlineLimit: 65536,
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        code: 'src/plugin/code.ts',
        ui: resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
  plugins: [
    preact(),
    {
      name: 'figma-inline-html',
      enforce: 'post',
      apply: 'build',
      async generateBundle(_options, bundle) {
        let cssCode = '';
        let jsCode = '';

        for (const key of Object.keys(bundle)) {
          const chunk = bundle[key];
          if (key.endsWith('.css') && chunk.type === 'asset') {
            cssCode += chunk.source;
            delete bundle[key];
          } else if (
            key.endsWith('.js') &&
            !key.includes('code.js') &&
            chunk.type === 'chunk'
          ) {
            jsCode += chunk.code;
            delete bundle[key];
          }
        }

        // Escape </script> inside JS so it doesn't break the inline <script> tag
        const safeJs = jsCode.replace(/<\/script>/gi, '<\\/script>');

        const fs = await import('fs');
        const path = await import('path');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Color Me Good</title>
<style>${cssCode}</style>
</head>
<body>
<div id="app"></div>
<script>${safeJs}</script>
</body>
</html>`;

        // Remove any existing HTML assets
        for (const key of Object.keys(bundle)) {
          if (key.endsWith('.html')) delete bundle[key];
        }

        this.emitFile({
          type: 'asset',
          fileName: 'ui.html',
          source: html,
        });

        const manifestPath = path.resolve(__dirname, 'manifest.json');
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');

        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: manifestContent,
        });
      },
    },
  ],
});
