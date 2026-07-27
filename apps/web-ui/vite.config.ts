import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

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
  plugins: [copyBrandAssetsPlugin(), tailwindcss(), sveltekit()],
});
