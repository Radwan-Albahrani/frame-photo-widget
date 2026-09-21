import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const resolve = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@backend": resolve("./src/backend"),
      "@native": resolve("./src/native"),
      "@ui": resolve("./src/ui"),
      "@const": resolve("./src/const"),
      "@": resolve("./"),
    },
  },
});
