import type { Transaction } from '../../types/app'
import { slugifyStatus } from '../../utils/location'

const formatDisplayDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

export function UserTable({ transactions }: { transactions: Transaction[] }) {
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
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.number}>
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
              <td data-label="Amount Payable">{transaction.amountPayable ?? 0}</td>
              <td data-label="Status">
                <span className={`status-pill status-${slugifyStatus(transaction.status)}`}>
                  {transaction.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
