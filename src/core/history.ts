/**
 * Historique annuler/rétablir générique par instantanés (chaînes opaques) :
 * n'a aucune connaissance des lianes, seulement des chaînes à empiler et
 * transférer entre deux piles — réutilisable tel quel pour n'importe quel
 * état sérialisable.
 */
export class SnapshotHistory {
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  constructor(private readonly limit: number) {}

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** À appeler juste avant toute mutation structurelle, avec l'instantané de l'état qui va être remplacé. */
  push(snapshot: string): void {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  /** Retourne l'instantané précédent à restaurer, ou `null` si l'historique est vide. `current` est conservé pour un éventuel rétablissement. */
  undo(current: string): string | null {
    return this.transfer(this.undoStack, this.redoStack, current);
  }

  /** Symétrique de `undo`. */
  redo(current: string): string | null {
    return this.transfer(this.redoStack, this.undoStack, current);
  }

  private transfer(from: string[], to: string[], current: string): string | null {
    if (from.length === 0) return null;
    to.push(current);
    return from.pop()!;
  }
}
