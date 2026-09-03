import { defineConfig } from "vite";

// Base en sous-chemin car ce sera hébergé sur GitHub Pages en tant que
// "project page" : https://<user>.github.io/HelloWorld/
export default defineConfig({
  base: "/HelloWorld/",
});
