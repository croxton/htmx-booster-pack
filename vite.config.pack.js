import { defineConfig } from 'vite';

export default defineConfig(({}) => {
    return {
      esbuild: {
        minifyIdentifiers: false
      },
      build: {
        lib: {
          entry: {
            "booster-pack": "./lib/ext/booster-pack.mjs"
          },
          formats: ["es"],
          fileName: (format, name) => `${name}.min.mjs`
        },
        minify: true
      }
    }
});