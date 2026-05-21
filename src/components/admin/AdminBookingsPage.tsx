import { useEffect, useMemo, useState } from 'react'

import { api } from '../../api/client'
import { TableControls } from '../shared/TableControls'
import { searchRows, stableSort, type SortConfig } from '../../utils/tableHelpers'
import type { AdminBooking, Port } from '../../types/admin'

type Status = { id: number; status_label: string }

const monthOptions = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

const slugifyStatus = (status: string): string => {
  return status
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString()
}

const toDateInputValue = (dateString: string | null) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toDateTimeInputValue = (dateString: string | null) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const getGoodsTypeLabel = (typeOfGoodsId: number | null) => {
  if (typeOfGoodsId === 1) return 'perishable'
  if (typeOfGoodsId === 0) return 'non-perishable'
  return 'N/A'
}

const formatMonthYear = (dateString: string | null) => {
  if (!dateString) return null
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return null
  return {
    month: monthOptions[date.getMonth()],
    year: date.getFullYear(),
  }
}

const escapeCsvValue = (value: string) => `"${value.replace(/"/g, '""')}"`

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const currentDate = new Date()

export function AdminBookingsPage({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [shipments, setShipments] = useState<AdminBooking[]>([])
  const [ports, setPorts] = useState<Port[]>([])
  const [statuses, setStatuses] = useState<Status[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<(typeof monthOptions)[number]>(monthOptions[currentDate.getMonth()])
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [editingShipmentId, setEditingShipmentId] = useState<number | null>(null)
  const [editValues, setEditValues] = useState<Record<number, Partial<AdminBooking>>>({})
  const [dateEditor, setDateEditor] = useState<{ shipmentId: number; field: 'actual_time_departure' | 'pickup_date' } | null>(null)
  const [dateDraft, setDateDraft] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'book_date', direction: 'desc' })

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const [shipmentsData, portsData, statusesData] = await Promise.all([
          api.getAdminShipments(),
          api.getAdminPorts(),
          api.getAdminStatuses(),
        ])
        setShipments(shipmentsData || [])
        setPorts(portsData || [])
        setStatuses(statusesData || [])
      } catch (err: any) {
        setError(err.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const availableYears = useMemo(() => {
    const years = Array.from(
      new Set(
        shipments
          .map((shipment) => formatMonthYear(shipment.book_date)?.year)
          .filter((year): year is number => typeof year === 'number' && Number.isFinite(year)),
      ),
    )

    return years.length > 0 ? years.sort((left, right) => left - right) : [currentDate.getFullYear()]
  }, [shipments])

  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0])
    }
  }, [availableYears, selectedYear])

  const filteredRows = useMemo(
    () =>
      shipments.filter((shipment) => {
        const shipmentDate = formatMonthYear(shipment.book_date)
        if (!shipmentDate) return false
        return shipmentDate.month === selectedMonth && shipmentDate.year === selectedYear
      }),
    [shipments, selectedMonth, selectedYear],
  )

  const searchedRows = useMemo(() => {
    const rowToSearchString = (shipment: AdminBooking) =>
      [
        getStatusLabel(shipment.status_id ?? shipment.status ?? null, shipment.status_label),
        shipment.transport_number,
        shipment.shipper_name,
        getPortName(shipment.destination_port),
        getPortName(shipment.departure_port),
        formatDate(shipment.book_date),
        shipment.mbl_number,
        shipment.fsl_type,
        String(shipment.container_20 ?? ''),
        String(shipment.container_40 ?? ''),
        getGoodsTypeLabel(shipment.type_of_goods_id ?? null),
        formatDate(shipment.pickup_date),
        formatDate(shipment.actual_time_departure),
        String(shipment.amount ?? ''),
        shipment.pickup_location,
        shipment.dropoff_location,
      ]
        .filter(Boolean)
        .join(' ')

    return searchRows(filteredRows, rowToSearchString, searchTerm)
  }, [filteredRows, searchTerm])

  const sortedRows = useMemo(() => {
    const compareValues = (left: AdminBooking, right: AdminBooking) => {
      const getValue = (shipment: AdminBooking) => {
        switch (sortConfig.field) {
          case 'status_label':
            return getStatusLabel(shipment.status_id ?? shipment.status ?? null, shipment.status_label).toLowerCase()
          case 'transport_number':
            return shipment.transport_number?.toLowerCase() ?? ''
          case 'shipper_name':
            return shipment.shipper_name.toLowerCase()
          case 'destination_port':
            return getPortName(shipment.destination_port).toLowerCase()
          case 'departure_port':
            return getPortName(shipment.departure_port).toLowerCase()
          case 'book_date':
            return shipment.book_date ? new Date(shipment.book_date).getTime() : 0
          case 'container_20':
            return shipment.container_20 ?? 0
          case 'container_40':
            return shipment.container_40 ?? 0
          case 'type_of_goods_id':
            return getGoodsTypeLabel(shipment.type_of_goods_id ?? null).toLowerCase()
          case 'pickup_date':
            return shipment.pickup_date ? new Date(shipment.pickup_date).getTime() : 0
          case 'actual_time_departure':
            return shipment.actual_time_departure ? new Date(shipment.actual_time_departure).getTime() : 0
          case 'amount':
            return shipment.amount ?? 0
          default:
            return ''
        }
      }

      const leftValue = getValue(left)
      const rightValue = getValue(right)

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortConfig.direction === 'asc' ? leftValue - rightValue : rightValue - leftValue
      }

      return sortConfig.direction === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue))
    }

    return stableSort(searchedRows, compareValues)
  }, [searchedRows, sortConfig])

  const cycleSort = (field: string) => {
    if (sortConfig.field !== field) {
      setSortConfig({ field, direction: 'asc' })
      return
    }

    setSortConfig({
      field,
      direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
    })
  }

  const getSortIcon = (field: string) => {
    if (sortConfig.field !== field) return '⇅'
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const getPortName = (portId: number | null) => {
    if (!portId) return 'N/A'
    return ports.find((port) => port.id === portId)?.port_name || `Port ${portId}`
  }

  const getStatusLabel = (statusId?: number | null, fallbackLabel?: string | null) => {
    if (typeof statusId === 'number') {
      return statuses.find((status) => status.id === statusId)?.status_label ?? fallbackLabel ?? 'N/A'
    }

    return fallbackLabel ?? 'N/A'
  }

  const handleMonthStep = (direction: 1 | -1) => {
    const currentIndex = monthOptions.indexOf(selectedMonth)
    const nextYear = selectedYear + (currentIndex + direction < 0 ? -1 : currentIndex + direction > 11 ? 1 : 0)
    const nextMonthIndex = (currentIndex + direction + monthOptions.length) % monthOptions.length

    if (!availableYears.includes(nextYear)) {
      return
    }

    setSelectedMonth(monthOptions[nextMonthIndex])
    setSelectedYear(nextYear)
    setEditingShipmentId(null)
    setEditValues({})
  }

  const handleEdit = (shipment: AdminBooking) => {
    setEditingShipmentId(shipment.id)
    setEditValues({
      [shipment.id]: {
        ...shipment,
        status_id:
          shipment.status_id ?? statuses.find((status) => status.status_label === shipment.status_label)?.id ?? null,
      },
    })
  }

  const handleSave = async (shipmentId: number) => {
    try {
      const values = editValues[shipmentId]
      if (!values) return

      await api.updateAdminShipment(shipmentId, {
        destination_port: values.destination_port,
        departure_port: values.departure_port,
        fsl_type: values.fsl_type || undefined,
        status_id: values.status_id ?? undefined,
        actual_time_departure: values.actual_time_departure || undefined,
        pickup_date: values.pickup_date || undefined,
        amount: values.amount ?? undefined,
      })

      setShipments((current) =>
        current.map((shipment) => {
          if (shipment.id !== shipmentId) return shipment

          const nextStatusLabel = getStatusLabel(values.status_id ?? shipment.status_id ?? null, shipment.status_label)
          return {
            ...shipment,
            ...values,
            status_id: values.status_id ?? shipment.status_id ?? null,
            status_label: nextStatusLabel,
          }
        }),
      )
      setEditingShipmentId(null)
      setEditValues({})
    } catch (err: any) {
      setError(err.message || 'Failed to save shipment')
    }
  }

  const handleCancel = () => {
    setEditingShipmentId(null)
    setEditValues({})
  }

  const openDateEditor = (shipmentId: number, field: 'actual_time_departure' | 'pickup_date', value: string | null) => {
    setDateEditor({ shipmentId, field })
    setDateDraft(field === 'actual_time_departure' ? toDateTimeInputValue(value) : toDateInputValue(value))
  }

  const saveDateEditor = () => {
    if (!dateEditor) return
    const nextValue = dateEditor.field === 'actual_time_departure'
      ? (dateDraft ? new Date(dateDraft).toISOString() : null)
      : (dateDraft ? dateDraft : null)

    handleFieldChange(dateEditor.shipmentId, dateEditor.field, nextValue)
    setDateEditor(null)
    setDateDraft('')
  }

  const closeDateEditor = () => {
    setDateEditor(null)
    setDateDraft('')
  }

  const handleFieldChange = (shipmentId: number, field: keyof AdminBooking, value: any) => {
    setEditValues((current) => ({
      ...current,
      [shipmentId]: {
        ...current[shipmentId],
        [field]: value,
      },
    }))
  }

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportRows = sortedRows.map((shipment) => ({
    status: getStatusLabel(shipment.status_id ?? null, shipment.status_label),
    transactionNumber: shipment.transport_number || 'N/A',
    shipper: shipment.shipper_name || 'N/A',
    destinationPort: getPortName(shipment.destination_port),
    departurePort: getPortName(shipment.departure_port),
    bookDate: formatDate(shipment.book_date),
    mblNumber: shipment.mbl_number || 'N/A',
    fslType: shipment.fsl_type || 'N/A',
    container20: String(shipment.container_20 ?? 0),
    container40: String(shipment.container_40 ?? 0),
    typeOfGoods: getGoodsTypeLabel(shipment.type_of_goods_id ?? null),
    pickupDate: formatDate(shipment.pickup_date),
    actualTimeDeparture: formatDate(shipment.actual_time_departure),
    amountRecievable: String(shipment.amount ?? 0),
    pickupLocation: shipment.pickup_location || 'N/A',
    dropoffLocation: shipment.dropoff_location || 'N/A',
  }))

  const exportCurrentTableToCsv = () => {
    const headers = [
      'Status',
      'Transaction Number',
      'Shipper',
      'Destination Port',
      'Departure Port',
      'Book Date',
      'MBL Number',
      'FSL Type',
      'Container 20',
      'Container 40',
      'Type of Goods',
      'Pickup Date',
      'Actual Time Departure',
      'Amount Recievable',
      'Pickup Location',
      'Drop-off Location',
    ]

    const rows = exportRows.map((row) => [
      row.status,
      row.transactionNumber,
      row.shipper,
      row.destinationPort,
      row.departurePort,
      row.bookDate,
      row.mblNumber,
      row.fslType,
      row.container20,
      row.container40,
      row.typeOfGoods,
      row.pickupDate,
      row.actualTimeDeparture,
      row.amountRecievable,
      row.pickupLocation,
      row.dropoffLocation,
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(String(value))).join(','))
      .join('\r\n')

    const filename = `admin-bookings-${selectedMonth}-${selectedYear}.csv`
    downloadFile(filename, `\uFEFF${csv}`, 'text/csv;charset=utf-8;')
  }

  const exportCurrentTableToExcel = () => {
    const headers = [
      'Status',
      'Transaction Number',
      'Shipper',
      'Destination Port',
      'Departure Port',
      'Book Date',
      'MBL Number',
      'FSL Type',
      'Container 20',
      'Container 40',
      'Type of Goods',
      'Pickup Date',
      'Actual Time Departure',
      'Amount Recievable',
      'Pickup Location',
      'Drop-off Location',
    ]

    const rows = exportRows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(row.transactionNumber)}</td>
            <td>${escapeHtml(row.shipper)}</td>
            <td>${escapeHtml(row.destinationPort)}</td>
            <td>${escapeHtml(row.departurePort)}</td>
            <td>${escapeHtml(row.bookDate)}</td>
            <td>${escapeHtml(row.mblNumber)}</td>
            <td>${escapeHtml(row.fslType)}</td>
            <td>${escapeHtml(row.container20)}</td>
            <td>${escapeHtml(row.container40)}</td>
            <td>${escapeHtml(row.typeOfGoods)}</td>
            <td>${escapeHtml(row.pickupDate)}</td>
            <td>${escapeHtml(row.actualTimeDeparture)}</td>
            <td>${escapeHtml(row.amountRecievable)}</td>
            <td>${escapeHtml(row.pickupLocation)}</td>
            <td>${escapeHtml(row.dropoffLocation)}</td>
          </tr>`,
      )
      .join('')

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `

    const filename = `admin-bookings-${selectedMonth}-${selectedYear}.xls`
    downloadFile(filename, html, 'application/vnd.ms-excel;charset=utf-8;')
  }

  if (loading) {
    return (
      <main className="admin-page">
        <header className="admin-nav">
          <div className="admin-brand">BOOKINGS</div>
          <nav className="nav-links">
            <button type="button" className="link-button nav-link" onClick={onBack}>
              Dashboard
            </button>
            <span className="nav-divider" aria-hidden="true" />
            <button type="button" className="link-button nav-link admin-logout" onClick={onLogout}>
              Log out
            </button>
          </nav>
        </header>
        <section className="admin-content admin-bookings-content">
          <p>Loading...</p>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-nav">
        <div className="admin-brand">BOOKINGS</div>
        <nav className="nav-links">
          <button type="button" className="link-button nav-link" onClick={onBack}>
            Dashboard
          </button>
          <span className="nav-divider" aria-hidden="true" />
          <button type="button" className="link-button nav-link admin-logout" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <section className="admin-content admin-bookings-content">
        <div className="admin-toolbar admin-bookings-toolbar">
          <h2>Bookings</h2>
          <div className="admin-bookings-filters">
            <TableControls searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder="Search bookings..." />

            <label className="month-select-wrap">
              <span className="sr-only">Select month</span>
              <select
                className="month-select"
                value={selectedMonth}
                onChange={(event) => {
                  setSelectedMonth(event.target.value as (typeof monthOptions)[number])
                  setEditingShipmentId(null)
                  setEditValues({})
                }}
              >
                {monthOptions.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </label>

            <label className="year-select-wrap">
              <span className="sr-only">Select year</span>
              <select
                className="year-select"
                value={selectedYear}
                onChange={(event) => {
                  setSelectedYear(Number(event.target.value))
                  setEditingShipmentId(null)
                  setEditValues({})
                }}
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && <p className="auth-error" style={{ marginBottom: '1rem' }}>{error}</p>}

        <div className="admin-bookings-table-shell">
          <div className="table-card admin-bookings-table-card">
            <table className="admin-bookings-table">
              <thead>
                <tr>
                  <th className="admin-bookings-sticky-actions"></th>
                  <th className="admin-bookings-sticky-status table-header-sortable" onClick={() => cycleSort('status_label')}>
                    Status <span className="sort-icon">{getSortIcon('status_label')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('transport_number')}>
                    Transaction Number <span className="sort-icon">{getSortIcon('transport_number')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('shipper_name')}>
                    Shipper <span className="sort-icon">{getSortIcon('shipper_name')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('destination_port')}>
                    Destination Port <span className="sort-icon">{getSortIcon('destination_port')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('departure_port')}>
                    Departure Port <span className="sort-icon">{getSortIcon('departure_port')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('book_date')}>
                    Book Date <span className="sort-icon">{getSortIcon('book_date')}</span>
                  </th>
                  <th>MBL Number</th>
                  <th>FSL Type</th>
                  <th className="table-header-sortable" onClick={() => cycleSort('container_20')}>
                    Container 20 <span className="sort-icon">{getSortIcon('container_20')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('container_40')}>
                    Container 40 <span className="sort-icon">{getSortIcon('container_40')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('type_of_goods_id')}>
                    Type of Goods <span className="sort-icon">{getSortIcon('type_of_goods_id')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('pickup_date')}>
                    Pickup Date <span className="sort-icon">{getSortIcon('pickup_date')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('actual_time_departure')}>
                    Actual Time Departure <span className="sort-icon">{getSortIcon('actual_time_departure')}</span>
                  </th>
                  <th className="table-header-sortable" onClick={() => cycleSort('amount')}>
                    Amount Recievable <span className="sort-icon">{getSortIcon('amount')}</span>
                  </th>
                  <th>Pickup Location</th>
                  <th>Drop-off Location</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="admin-empty-state">
                      No bookings found for {selectedMonth} {selectedYear}.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((shipment) => {
                    const isEditing = editingShipmentId === shipment.id
                    const values = editValues[shipment.id] || shipment
                    const activeStatusLabel = getStatusLabel(values.status_id ?? shipment.status_id ?? null, shipment.status_label)

                    return (
                      <tr key={shipment.id}>
                        <td data-label="Actions" className="admin-bookings-sticky-actions">
                          {isEditing ? (
                            <div className="admin-bookings-action-buttons">
                              <button type="button" className="link-button" onClick={() => handleSave(shipment.id)}>
                                Save
                              </button>
                              <button type="button" className="link-button" onClick={handleCancel}>
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="admin-bookings-action-buttons">
                              <button type="button" className="link-button" onClick={() => handleEdit(shipment)}>
                                Edit
                              </button>
                            </div>
                          )}
                        </td>
                        <td data-label="Status" className="admin-bookings-sticky-status">
                          {isEditing ? (
                            <select
                              className={`status-select status-${slugifyStatus(activeStatusLabel)}`}
                              value={values.status_id ?? ''}
                              onChange={(event) =>
                                handleFieldChange(
                                  shipment.id,
                                  'status_id',
                                  event.target.value ? Number(event.target.value) : null,
                                )
                              }
                            >
                              <option value="">Select Status</option>
                              {statuses.map((status) => (
                                <option key={status.id} value={status.id}>
                                  {status.status_label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className={`status-pill status-${slugifyStatus(activeStatusLabel)}`}>
                              {activeStatusLabel}
                            </span>
                          )}
                        </td>
                        <td data-label="Transaction Number">{shipment.transport_number || 'N/A'}</td>
                        <td data-label="Shipper">{shipment.shipper_name || 'N/A'}</td>
                        <td data-label="Destination Port">
                          {isEditing ? (
                            <select
                              value={values.destination_port || ''}
                              onChange={(event) =>
                                handleFieldChange(
                                  shipment.id,
                                  'destination_port',
                                  event.target.value ? Number(event.target.value) : null,
                                )
                              }
                            >
                              <option value="">Select Port</option>
                              {ports.map((port) => (
                                <option key={port.id} value={port.id}>
                                  {port.port_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            getPortName(shipment.destination_port)
                          )}
                        </td>
                        <td data-label="Departure Port">
                          {isEditing ? (
                            <select
                              value={values.departure_port || ''}
                              onChange={(event) =>
                                handleFieldChange(
                                  shipment.id,
                                  'departure_port',
                                  event.target.value ? Number(event.target.value) : null,
                                )
                              }
                            >
                              <option value="">Select Port</option>
                              {ports.map((port) => (
                                <option key={port.id} value={port.id}>
                                  {port.port_name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            getPortName(shipment.departure_port)
                          )}
                        </td>
                        <td data-label="Book Date">{formatDate(shipment.book_date)}</td>
                        <td data-label="MBL Number">{shipment.mbl_number || 'N/A'}</td>
                        <td data-label="FSL Type">
                          {isEditing ? (
                            <input
                              type="text"
                              value={values.fsl_type || ''}
                              onChange={(event) => handleFieldChange(shipment.id, 'fsl_type', event.target.value || null)}
                              placeholder="Enter FSL Type"
                            />
                          ) : (
                            shipment.fsl_type || 'N/A'
                          )}
                        </td>
                        <td data-label="Container 20">{shipment.container_20 || 0}</td>
                        <td data-label="Container 40">{shipment.container_40 || 0}</td>
                        <td data-label="Type of Goods">{getGoodsTypeLabel(shipment.type_of_goods_id ?? null)}</td>
                        <td data-label="Pickup Date">
                          {isEditing ? (
                            <button
                              type="button"
                              className="date-edit-trigger"
                              onClick={() => openDateEditor(shipment.id, 'pickup_date', values.pickup_date ?? shipment.pickup_date ?? null)}
                            >
                              {formatDate(values.pickup_date ?? shipment.pickup_date ?? null)}
                            </button>
                          ) : (
                            formatDate(shipment.pickup_date)
                          )}
                        </td>
                        <td data-label="Actual Time Departure">
                          {isEditing ? (
                            <button
                              type="button"
                              className="date-edit-trigger"
                              onClick={() => openDateEditor(shipment.id, 'actual_time_departure', values.actual_time_departure ?? shipment.actual_time_departure ?? null)}
                            >
                              {formatDate(values.actual_time_departure ?? shipment.actual_time_departure ?? null)}
                            </button>
                          ) : (
                            formatDate(shipment.actual_time_departure)
                          )}
                        </td>
                        <td data-label="Amount Recievable">
                          {isEditing ? (
                            <input
                              type="number"
                              value={values.amount ?? shipment.amount ?? ''}
                              onChange={(event) => handleFieldChange(shipment.id, 'amount', event.target.value ? Number(event.target.value) : null)}
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          ) : (
                            Number(shipment.amount ?? 0)
                          )}
                        </td>
                        <td data-label="Pickup Location">{shipment.pickup_location || 'N/A'}</td>
                        <td data-label="Drop-off Location">{shipment.dropoff_location || 'N/A'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-bookings-footer">
          <div className="pagination-bar admin-month-nav" aria-label="Month navigation">
            <button type="button" className="pagination-link" onClick={() => handleMonthStep(-1)}>
              ← Back
            </button>
            <span className="pagination-ellipsis">
              {selectedMonth} {selectedYear}
            </span>
            <button type="button" className="pagination-link" onClick={() => handleMonthStep(1)}>
              Next →
            </button>
          </div>

          <div className="admin-export-actions">
            <button type="button" className="pagination-link admin-export-button" onClick={exportCurrentTableToCsv} disabled={filteredRows.length === 0}>
              Export CSV
            </button>
            <button type="button" className="pagination-link admin-export-button" onClick={exportCurrentTableToExcel} disabled={filteredRows.length === 0}>
              Export Excel
            </button>
          </div>
        </div>

        {dateEditor ? (
          <div className="modal-backdrop admin-date-editor-backdrop" role="presentation" onClick={closeDateEditor}>
            <section className="booking-modal admin-date-editor-modal" role="dialog" aria-modal="true" aria-labelledby="admin-date-editor-title" onClick={(event) => event.stopPropagation()}>
              <h2 id="admin-date-editor-title">Edit {dateEditor.field === 'pickup_date' ? 'Pickup Date' : 'Actual Time Departure'}</h2>
              <label className="field">
                <span>{dateEditor.field === 'pickup_date' ? 'Pickup Date' : 'Actual Time Departure'}</span>
                <input
                  type={dateEditor.field === 'pickup_date' ? 'date' : 'datetime-local'}
                  value={dateDraft}
                  onChange={(event) => setDateDraft(event.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="cancel-pill" onClick={closeDateEditor}>Cancel</button>
                <button type="button" className="primary-pill confirm-pill" onClick={saveDateEditor}>Save</button>
              </div>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}
