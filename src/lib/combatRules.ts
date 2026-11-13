/** Un golpe acertado siempre deja al menos una herida. */
export function minimumHitDamage(rolledDamage: number): number {
  return Number.isFinite(rolledDamage) ? Math.max(1, Math.trunc(rolledDamage)) : 1;
}
