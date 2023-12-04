import { defineConfig } from 'vite';

export default defineConfig({
    esbuild: {
        minifyIdentifiers: false
    },
    build: {
        lib: {
            entry: {
                "booster": "./lib/ext/booster.js"
            },
            formats: ["es"],
            fileName: (format, name) => `${name}.min.js`
        },
        minify: true
    }
});