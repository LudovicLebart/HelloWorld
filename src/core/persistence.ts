/**
 * Accès localStorage générique : ne connaît que des clés et des chaînes,
 * aucune notion de liane. Toujours défensif — le stockage peut être
 * indisponible (navigation privée, quota dépassé) sans que ce soit fatal.
 */

export function saveToStorage(key: string, data: string): void {
  try {
    localStorage.setItem(key, data);
  } catch {
    // Stockage indisponible : tant pis, pas fatal.
  }
}

export function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
