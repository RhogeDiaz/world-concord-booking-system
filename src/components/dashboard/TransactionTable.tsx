import { useMemo, useState } from 'react'
import type { StatusOption, Transaction } from '../../types/app'
import { statusOptions } from '../../types/app'
import { slugifyStatus } from '../../utils/location'
import { searchRows, stableSort } from '../../utils/tableHelpers'
import type { SortConfig } from '../../utils/tableHelpers'
import { TableControls } from '../shared/TableControls'

const formatDisplayDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const defaultSort: SortConfig = { field: 'bookDate', direction: 'asc' }

export function TransactionTable({
  transactions,
  onStatusChange,
}: {
  transactions: Transaction[]
  onStatusChange: (number: string, status: StatusOption) => void
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort)

  const rowToSearchString = (t: Transaction) =>
    [
      t.number,
      t.destinationPort,
      t.departurePort,
      String(t.container20),
      String(t.container40),
      t.typeOfGoods,
      t.fslType,
      t.pickup,
      t.dropoff,
      t.actualTimeDeparture,
      t.bookDate,
      t.pickupDate,
      t.status,
    ]
      .filter(Boolean)
      .join(' | ')

  const filtered = useMemo(() => searchRows(transactions, rowToSearchString, searchTerm), [transactions, searchTerm])

  const compareBy = (a: Transaction, b: Transaction) => {
    const field = sortConfig.field
    const dir = sortConfig.direction === 'desc' ? -1 : 1

    const safe = (v: any) => (v === null || typeof v === 'undefined' ? '' : v)

    switch (field) {
      case 'status': {
        const r = String(safe(a.status)).localeCompare(String(safe(b.status)))
        if (r !== 0) return r * dir
        return String(a.number).localeCompare(String(b.number)) * dir
      }
      case 'destinationPort':
        return String(safe(a.destinationPort)).localeCompare(String(safe(b.destinationPort))) * dir
      case 'departurePort':
        return String(safe(a.departurePort)).localeCompare(String(safe(b.departurePort))) * dir
      case 'bookDate': {
        const av = Number(new Date(a.bookDate)) || 0
        const bv = Number(new Date(b.bookDate)) || 0
        return (av - bv) * -dir
      }
      case 'fslType':
        return String(safe(a.fslType)).localeCompare(String(safe(b.fslType))) * dir
      case 'container20':
        return (Number(a.container20 || 0) - Number(b.container20 || 0)) * -dir
      case 'container40':
        return (Number(a.container40 || 0) - Number(b.container40 || 0)) * -dir
      case 'typeOfGoods':
        return String(safe(a.typeOfGoods)).localeCompare(String(safe(b.typeOfGoods))) * dir
      case 'pickupDate': {
        const av = Number(new Date(a.pickupDate)) || 0
        const bv = Number(new Date(b.pickupDate)) || 0
        return (av - bv) * -dir
      }
      case 'actualTimeDeparture': {
        const av = Number(new Date(a.actualTimeDeparture)) || 0
        const bv = Number(new Date(b.actualTimeDeparture)) || 0
        return (av - bv) * -dir
      }
      default:
        return String(safe(a.number)).localeCompare(String(safe(b.number))) * dir
    }
  }

  const sorted = useMemo(() => stableSort(filtered, compareBy), [filtered, sortConfig])

  const cycleSort = (column: string) => {
    const mapping: Record<string, { primary: 'asc' | 'desc'; secondary: 'asc' | 'desc' }> = {
      status: { primary: 'asc', secondary: 'desc' },
      destinationPort: { primary: 'asc', secondary: 'desc' },
      departurePort: { primary: 'asc', secondary: 'desc' },
      bookDate: { primary: 'desc', secondary: 'asc' },
      fslType: { primary: 'asc', secondary: 'desc' },
      container20: { primary: 'desc', secondary: 'asc' },
      container40: { primary: 'desc', secondary: 'asc' },
      typeOfGoods: { primary: 'asc', secondary: 'desc' },
      pickupDate: { primary: 'desc', secondary: 'asc' },
      actualTimeDeparture: { primary: 'desc', secondary: 'asc' },
    }

    const current = sortConfig
    const behavior = mapping[column] || { primary: 'asc', secondary: 'desc' }

    if (current.field !== column) {
      setSortConfig({ field: column, direction: behavior.primary })
      return
    }

    if (current.direction === behavior.primary) {
      setSortConfig({ field: column, direction: behavior.secondary })
      return
    }

    setSortConfig(defaultSort)
  }

  const getIcon = (column: string) => {
    if (sortConfig.field !== column) return '⇅'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  return (
    <div>
      <div style={{ margin: '12px 0' }}>
        <TableControls searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search..." />
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th onClick={() => cycleSort('status')} className={`table-header-sortable ${sortConfig.field === 'status' ? 'sort-active' : ''}`}>
                Status <span className="sort-icon">{getIcon('status')}</span>
              </th>
              <th onClick={() => cycleSort('number')} className={`table-header-sortable ${sortConfig.field === 'number' ? 'sort-active' : ''}`}>
                Transaction Number <span className="sort-icon">{getIcon('number')}</span>
              </th>
              <th onClick={() => cycleSort('destinationPort')} className={`table-header-sortable ${sortConfig.field === 'destinationPort' ? 'sort-active' : ''}`}>
                Destination Port <span className="sort-icon">{getIcon('destinationPort')}</span>
              </th>
              <th onClick={() => cycleSort('departurePort')} className={`table-header-sortable ${sortConfig.field === 'departurePort' ? 'sort-active' : ''}`}>
                Departure Port <span className="sort-icon">{getIcon('departurePort')}</span>
              </th>
              <th onClick={() => cycleSort('container20')} className={`table-header-sortable ${sortConfig.field === 'container20' ? 'sort-active' : ''}`}>
                Container 20 <span className="sort-icon">{getIcon('container20')}</span>
              </th>
              <th onClick={() => cycleSort('container40')} className={`table-header-sortable ${sortConfig.field === 'container40' ? 'sort-active' : ''}`}>
                Container 40 <span className="sort-icon">{getIcon('container40')}</span>
              </th>
              <th onClick={() => cycleSort('typeOfGoods')} className={`table-header-sortable ${sortConfig.field === 'typeOfGoods' ? 'sort-active' : ''}`}>
                Type of Goods <span className="sort-icon">{getIcon('typeOfGoods')}</span>
              </th>
              <th onClick={() => cycleSort('fslType')} className={`table-header-sortable ${sortConfig.field === 'fslType' ? 'sort-active' : ''}`}>
                FSL Type <span className="sort-icon">{getIcon('fslType')}</span>
              </th>
              <th>Pick-up Location</th>
              <th>Drop-off Location</th>
              <th onClick={() => cycleSort('actualTimeDeparture')} className={`table-header-sortable ${sortConfig.field === 'actualTimeDeparture' ? 'sort-active' : ''}`}>
                Actual Time Departure <span className="sort-icon">{getIcon('actualTimeDeparture')}</span>
              </th>
              <th onClick={() => cycleSort('bookDate')} className={`table-header-sortable ${sortConfig.field === 'bookDate' ? 'sort-active' : ''}`}>
                Book Date <span className="sort-icon">{getIcon('bookDate')}</span>
              </th>
              <th onClick={() => cycleSort('pickupDate')} className={`table-header-sortable ${sortConfig.field === 'pickupDate' ? 'sort-active' : ''}`}>
                Pickup Date <span className="sort-icon">{getIcon('pickupDate')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={13} className="no-results-row">No results found</td>
              </tr>
            ) : (
              sorted.map((transaction) => (
                <tr key={transaction.number}>
                  <td data-label="Status">
                    <span className={`status-pill status-${slugifyStatus(transaction.status)}`} aria-hidden="true">
                      {transaction.status}
                    </span>
                    <select
                      className={`status-select status-${slugifyStatus(transaction.status)} status-select-compact`}
                      value={transaction.status}
                      aria-label={`Status for ${transaction.number}`}
                      onChange={(event) => onStatusChange(transaction.number, event.target.value as StatusOption)}
                    >
                      {statusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td data-label="Transaction Number">{transaction.number}</td>
                  <td data-label="Destination Port">{transaction.destinationPort}</td>
                  <td data-label="Departure Port">{transaction.departurePort}</td>
                  <td data-label="Container 20">{transaction.container20}</td>
                  <td data-label="Container 40">{transaction.container40}</td>
                  <td data-label="Type of Goods">{transaction.typeOfGoods}</td>
                  <td data-label="FSL Type">{transaction.fslType}</td>
                  <td data-label="Pick-up Location">{transaction.pickup}</td>
                  <td data-label="Drop-off Location">{transaction.dropoff}</td>
                  <td data-label="Actual Time Departure">{formatDisplayDate(transaction.actualTimeDeparture)}</td>
                  <td data-label="Book Date">{formatDisplayDate(transaction.bookDate)}</td>
                  <td data-label="Pickup Date">{formatDisplayDate(transaction.pickupDate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
