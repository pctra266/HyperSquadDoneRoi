import { defineConfig } from "vite";

export default defineConfig({
  root:      ".",
  publicDir: "assets",

  build: {
    outDir:      "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Vite 8 / Rolldown: manualChunks phải là function
        manualChunks(id) {
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
            return "firebase";
          }
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true,
  },
});
