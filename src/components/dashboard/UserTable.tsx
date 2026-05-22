import { useState } from 'react'
import type { Transaction } from '../../types/app'
import { slugifyStatus } from '../../utils/location'

const formatDisplayDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const toDateInputValue = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function UserTable({
  transactions,
  onUpdatePickupDate,
}: {
  transactions: Transaction[]
  onUpdatePickupDate: (transactionId: number, newPickupDate: string) => Promise<void>
}) {
  const [editingTransactionId, setEditingTransactionId] = useState<number | null>(null)
  const [dateDraft, setDateDraft] = useState('')
  const [modalError, setModalError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const openDateEditor = (transaction: Transaction) => {
    setEditingTransactionId(transaction.id)
    setDateDraft(toDateInputValue(transaction.pickupDate))
    setModalError(null)
  }

  const closeDateEditor = () => {
    setEditingTransactionId(null)
    setDateDraft('')
    setModalError(null)
  }

  const savePickupDate = async () => {
    if (!editingTransactionId) return
    if (!dateDraft) {
      setModalError('Please select a new pickup date.')
      return
    }

    setIsSaving(true)
    setModalError(null)

    try {
      await onUpdatePickupDate(editingTransactionId, dateDraft)
      closeDateEditor()
    } catch (err: any) {
      setModalError(err?.message || 'Unable to save the updated pickup date.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="table-card user-table-card">
      <table>
        <thead>
          <tr>
            <th>Transaction Number</th>
            <th>Destination Port</th>
            <th>Departure Port</th>
            <th>Container 20</th>
            <th>Container 40</th>
            <th>Type of Goods</th>
            <th>FSL Type</th>
            <th>Pick-up Location</th>
            <th>Drop-off Location</th>
            <th>Actual Time Departure</th>
            <th>Book Date</th>
            <th>Pickup Date</th>
            <th>Amount Payable</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => {
            const isRescheduled = transaction.status.toLowerCase() === 'rescheduled'
            const isEditing = editingTransactionId === transaction.id

            return (
              <tr key={transaction.id}>
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
                <td data-label="Pickup Date">
                  {isRescheduled ? (
                    <button
                      type="button"
                      className="date-edit-trigger"
                      onClick={() => openDateEditor(transaction)}
                    >
                      {formatDisplayDate(transaction.pickupDate)}
                    </button>
                  ) : (
                    formatDisplayDate(transaction.pickupDate)
                  )}
                </td>
                <td data-label="Amount Payable">{transaction.amountPayable ?? 0}</td>
                <td data-label="Status">
                  <span className={`status-pill status-${slugifyStatus(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </td>
                <td data-label="Action">
                  {isEditing ? (
                    <div className="inline-action-buttons">
                      <button type="button" className="primary-pill confirm-pill" onClick={savePickupDate} disabled={isSaving || !dateDraft}>
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" className="primary-pill cancel-pill" onClick={closeDateEditor} disabled={isSaving}>
                        Cancel
                      </button>
                    </div>
                  ) : isRescheduled ? (
                    <span className="inline-note">Tap pickup date to edit</span>
                  ) : (
                    <span className="inline-note">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {editingTransactionId !== null ? (
        <div className="modal-backdrop admin-date-editor-backdrop" role="presentation" onClick={closeDateEditor}>
          <section
            className="booking-modal admin-date-editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-date-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="user-date-editor-title">Edit Pickup Date</h2>
            <label className="field">
              <span>Pickup Date</span>
              <input type="date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} />
            </label>
            {modalError ? <p className="auth-error">{modalError}</p> : null}
            <div className="modal-actions">
              <button type="button" className="primary-pill cancel-pill" onClick={closeDateEditor} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="primary-pill confirm-pill" onClick={savePickupDate} disabled={isSaving || !dateDraft}>
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
