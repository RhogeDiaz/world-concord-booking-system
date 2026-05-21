export type SortConfig = { field: string; direction: 'asc' | 'desc' }

export function searchRows<T>(rows: T[], rowToString: (row: T) => string, term: string): T[] {
  if (!term || !term.trim()) return rows
  const q = term.toLowerCase()
  return rows.filter((row) => rowToString(row).toLowerCase().includes(q))
}

export function stableSort<T>(rows: T[], compare: (a: T, b: T) => number): T[] {
  return [...rows].sort(compare)
}
