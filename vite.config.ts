import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets into dist/ and converts module script tags in
      // dist/index.html into classic defer script tags so production builds
      // never fail strict module MIME checks on shared web hosts.
      {
        name: 'hosting-classic-bundle-postbuild',
        apply: 'build' as const,
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }

          const distIndexPath = path.resolve(distDir, 'index.html');
          if (!fs.existsSync(distIndexPath)) {
            return;
          }

          let html = fs.readFileSync(distIndexPath, 'utf8');
          html = html.replace(
            /<script\b[^>]*\bid=["']unbuilt-host-fallback["'][^>]*>[\s\S]*?<\/script>\s*/gi,
            '',
          );
          html = html.replace(/<link[^>]+rel=["']modulepreload["'][^>]*>\s*/gi, '');
          html = html.replace(
            /<link([^>]+)rel=["']stylesheet["']([^>]*)>/gi,
            (_m, before: string, after: string) =>
              `<link${before.replace(/\s*crossorigin(?:=["'][^"']*["'])?/gi, '')}rel="stylesheet"${after.replace(/\s*crossorigin(?:=["'][^"']*["'])?/gi, '')}>`,
          );
          html = html.replace(
            /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+\.js)["'][^>]*><\/script>/gi,
            (_m, src: string) => `<script defer src="${src}"></script>`,
          );

          fs.writeFileSync(distIndexPath, html, 'utf8');
        },
      },
    ],
    build: {
      rolldownOptions: {
        output: {
          format: 'iife' as const,
          codeSplitting: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
