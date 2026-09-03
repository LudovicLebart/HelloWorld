import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// Base en sous-chemin car ce sera hébergé sur GitHub Pages en tant que
// "project page" : https://<user>.github.io/HelloWorld/
export default defineConfig({
  base: "/HelloWorld/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      // Les icônes du manifest (icons/*.png) sont déjà couvertes par globPatterns
      // (glob sur tout /icons, mêmes fichiers) : sans ce false, vite-plugin-pwa les
      // ajoute une seconde fois au précache par sa propre logique.
      includeManifestIcons: false,
      // precache tout le shell buildé (JS/CSS/HTML/icônes) : l'app tourne hors-ligne
      // une fois visitée une première fois, y compris tracer/éditer/exporter — rien
      // de tout ça n'appelle de réseau, voir docs/how-to/installer-hors-ligne.md.
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
      },
      manifest: {
        id: "/HelloWorld/",
        lang: "fr",
        name: "Vignes & Arabesques",
        short_name: "Vignes & Arabesques",
        description:
          "Dessine des motifs de vignes et arabesques procéduraux, exportables en SVG pour la découpe CNC/laser.",
        start_url: "/HelloWorld/",
        scope: "/HelloWorld/",
        display: "standalone",
        background_color: "#f7f3ea",
        theme_color: "#7a5230",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
});
