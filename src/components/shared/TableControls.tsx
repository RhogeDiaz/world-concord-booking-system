import type { Dispatch, SetStateAction } from 'react'

export function TableControls({
  searchTerm,
  setSearchTerm,
  placeholder = 'Search...',
}: {
  searchTerm: string
  setSearchTerm: Dispatch<SetStateAction<string>>
  placeholder?: string
}) {
  return (
    <div className="table-controls" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <input
        className="search-input"
        aria-label="Search table"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm ? (
        <button type="button" className="clear-button" onClick={() => setSearchTerm('')} aria-label="Clear search">
          ✕
        </button>
      ) : null}
    </div>
  )
}
