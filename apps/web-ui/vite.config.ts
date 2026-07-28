import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyBrandAssetsPlugin() {
  return {
    name: 'copy-brand-assets',
    buildStart() {
      const srcDir = path.resolve(__dirname, '../../.omnigate/skills/ui-ux-design/assets');
      const destDir = path.resolve(__dirname, 'static/assets');
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(destDir, { recursive: true });
        const files = fs.readdirSync(srcDir);
        for (const file of files) {
          if (file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.svg')) {
            fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
          }
        }
      }
    },
  };
}

export default defineConfig({
  envDir: '../../',
  resolve: {
    alias: {
      '@txtgrph/ai-router': path.resolve(__dirname, '../../packages/ai-router/src/index.ts'),
      '@txtgrph/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@txtgrph/config': path.resolve(__dirname, '../../packages/config/src/index.ts'),
    },
  },
  plugins: [copyBrandAssetsPlugin(), tailwindcss(), sveltekit()],
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
