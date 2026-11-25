import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [
      react(),
      tailwindcss(),
      // Strips dev-only unbuilt fallback from dist/index.html and adds automatic
      // relative-asset fallback if hosted under a subdirectory with base: '/'.
      {
        name: 'production-white-screen-guard',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html: string): string {
            const cleaned = html.replace(
              /\s*<script id="unbuilt-host-fallback">[\s\S]*?<\/script>/i,
              '',
            );
            const scriptMatch = cleaned.match(
              /<script\s+type="module"[^>]*src="([^"]+)"[^>]*><\/script>/i,
            );
            const cssMatch = cleaned.match(
              /<link\s+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/i,
            );
            const entrySrc = scriptMatch?.[1] || '';
            const cssHref = cssMatch?.[1] || '';
            const relEntrySrc = entrySrc.startsWith('/') ? `.${entrySrc}` : entrySrc;
            const relCssHref = cssHref.startsWith('/') ? `.${cssHref}` : cssHref;

            const guardScript = `
    <script id="prod-asset-fallback">
      (function () {
        var retried = false;
        var entryRel = ${JSON.stringify(relEntrySrc)};
        var cssRel = ${JSON.stringify(relCssHref)};
        function showFallbackMessage(detail) {
          var root = document.getElementById('root');
          if (!root || root.children.length > 0) return;
          root.innerHTML =
            '<div style="max-width:600px;margin:48px auto;padding:24px;border:1px solid #fecdd3;border-radius:16px;background:#fff;font-family:Sarabun,sans-serif;color:#1c1917;line-height:1.7;">' +
            '<h2 style="margin:0 0 8px;color:#9f1239;font-size:18px;">ไม่สามารถโหลดไฟล์ระบบหน้าเว็บได้</h2>' +
            '<p style="margin:0 0 12px;font-size:14px;color:#44403c;">' + detail + '</p>' +
            '<button type="button" onclick="window.location.reload()" style="padding:8px 16px;border:none;border-radius:8px;background:#047857;color:#fff;font-weight:700;cursor:pointer;">โหลดหน้าใหม่อีกครั้ง</button>' +
            '</div>';
        }
        window.__retryRelativeAssets = function () {
          if (retried) return;
          retried = true;
          var root = document.getElementById('root');
          if (root && root.children.length > 0) return;
          if (cssRel && cssRel !== ${JSON.stringify(cssHref)}) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssRel;
            document.head.appendChild(link);
          }
          if (entryRel && entryRel !== ${JSON.stringify(entrySrc)}) {
            import(entryRel).catch(function (err) {
              showFallbackMessage('กรุณาตรวจสอบว่าได้อัปโหลดโฟลเดอร์ assets/ ครบถ้วน (' + (err && err.message ? err.message : 'Load failed') + ')');
            });
          } else {
            showFallbackMessage('กรุณาตรวจสอบการอัปโหลดไฟล์ในโฟลเดอร์ dist/ บนโฮสต์ให้ครบถ้วน');
          }
        };
      })();
    </script>`;

            let out = cleaned;
            if (entrySrc) {
              out = out.replace(
                `<script type="module" crossorigin src="${entrySrc}"></script>`,
                `${guardScript}\n    <script type="module" crossorigin src="${entrySrc}"${
                  relEntrySrc !== entrySrc
                    ? ' onerror="window.__retryRelativeAssets&&window.__retryRelativeAssets()"'
                    : ''
                }></script>`,
              );
            } else {
              out = out.replace('</head>', `${guardScript}\n  </head>`);
            }
            if (cssHref && relCssHref !== cssHref) {
              out = out.replace(
                `<link rel="stylesheet" crossorigin href="${cssHref}">`,
                `<link rel="stylesheet" crossorigin href="${cssHref}" onerror="if(!this.dataset.r){this.dataset.r='1';this.href='${relCssHref}';}">`,
              );
            }
            return out;
          },
        },
      },
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
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
        },
      },
    ],
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
