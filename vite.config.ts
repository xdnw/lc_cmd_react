import * as path from "path";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from 'rollup-plugin-visualizer';
import devConfig from './env.dev';
import mainConfig from './env.main';
import devTestConfig from './env.dev-test';
import testConfig from './env.test';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'dev' || mode === 'dev-test';
  const minify = !isDevelopment;
  const tsconfigPath = isDevelopment ? './tsconfig.dev.json' : './tsconfig.prod.json';
  let envConfig;
  switch (mode) {
    case 'dev':
      envConfig = devConfig;
      break;
    case 'dev-test':
      envConfig = devTestConfig;
      break;
    case 'test':
      envConfig = testConfig;
      break;
    case 'main':
    default:
      envConfig = mainConfig;
      break;
  }

  const processedEnvConfig = Object.fromEntries(
    Object.entries(envConfig).map(([key, value]) => {
      return [key, JSON.stringify(value)];
    })
  );
  processedEnvConfig['global'] = 'window';

  // Define base plugins
  const plugins = [
    tailwindcss(),
    react(),
    tsconfigPaths({ projects: [tsconfigPath] }),
    viteStaticCopy({
      targets: [
        {
          src: 'CNAME',
          dest: '.'
        }
      ]
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: envConfig['process.env.APPLICATION'] + ' Web Interface',
        short_name: envConfig['process.env.APPLICATION'],
        description: 'Discord bot web interface', // Replace with actual description
        background_color: '#1d293d',
        theme_color: '#1d293d',
        display: 'minimal-ui',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg}']
      }
    })
  ];

  // Conditionally add visualizer for 'main' mode
  if (mode === 'main') {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html', // Output path relative to 'dist'
        open: true, // Auto-open the report after build
        gzipSize: true, // Show gzipped sizes
      })
    );
  }

  return {
    define: processedEnvConfig,
    plugins: plugins, // Use the conditionally populated plugins array
    base: envConfig['process.env.BASE_PATH'],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps, { hostId, hostType }) => {
          return deps;
        },
      },
      reportCompressedSize: true,
      cssMinify: 'lightningcss',
      cssCodeSplit: true,
      sourcemap: isDevelopment,
      emptyOutDir: true,
      outDir: 'dist', // Ensure outDir is explicitly 'dist' if visualizer uses it
      terserOptions: {
        compress: {
          drop_console: minify,
          drop_debugger: minify,
        }
      },
      minify: minify ? 'terser' : false, // Use 'terser' for minification when enabled
      //   rollupOptions: {
      //     output: {
      //       manualChunks: (id) => {
      //         if (id.includes('node_modules/lucide-react')) {
      //           return 'lucide-core';
      //         }
      //         if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
      //           return 'vendor-react';
      //         }
      //         if (id.includes('node_modules/clsx') ||
      //           id.includes('node_modules/tailwind-merge') ||
      //           id.includes('node_modules/msgpackr')) {
      //           return 'vendor-utils';
      //         }
      //         if (id.includes('node_modules/@odiffey/discord-markdown')) {
      //           return 'vendor-discord-markdown';
      //         }
      //         // Consider removing manualChunks if default splitting is sufficient
      //       },
      //     },
      //   },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
    },
    chunkSizeWarningLimit: 600,
    esbuild: {
      target: 'es2020',
    },
    server: {
      hmr: true,
    },
  }
});

