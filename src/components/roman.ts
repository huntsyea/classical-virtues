const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

/** Roman numeral for small ordinals, as a book numbers its parts. */
export function roman(n: number): string {
  return ROMAN[n - 1] ?? String(n)
}
