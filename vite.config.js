import { defineConfig } from "vite";

export default defineConfig({
  // Serve từ thư mục gốc của project
  root: ".",

  // Assets public dir
  publicDir: "assets",

  build: {
    outDir:    "dist",
    emptyOutDir: true,
    // Không minify tên module để dễ debug
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/database", "firebase/analytics"],
        },
      },
    },
  },

  server: {
    port: 3000,
    open: true, // Tự mở browser khi chạy npm run dev
  },
});
