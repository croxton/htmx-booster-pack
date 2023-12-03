import { defineConfig } from 'vite';

export default defineConfig({
    esbuild: {
        minifyIdentifiers: false
    },
    build: {
        lib: {
            entry: {
                "components": "./lib/ext/components.js"
            },
            formats: ["es"],
            fileName: (format, name) => `${name}.min.js`
        },
        minify: true
    }
});