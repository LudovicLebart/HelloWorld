/**
 * Motif "feuille" de base, en coordonnées locales : point d'attache à l'origine
 * (0,0), pointe vers +x, taille nominale ~1 unité de large. Un vrai système de
 * brush chargerait ceci depuis un fichier .svg externe (voir Étape 2 du plan) ;
 * pour ce prototype le motif est inline pour rester autonome.
 */
export const LEAF_PATH_D = "M0,0 C0.12,-0.34 0.55,-0.46 1,0 C0.55,0.46 0.12,0.34 0,0 Z";

export const LEAF_NOMINAL_LENGTH = 1;
