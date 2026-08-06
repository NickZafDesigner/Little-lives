import { defineConfig } from "vite";

// GitHub Pages serves under /Little-lives/; Vercel (and local) use the site root.
const base = process.env.GITHUB_PAGES === "true" ? "/Little-lives/" : "/";

export default defineConfig({
  base,
});
