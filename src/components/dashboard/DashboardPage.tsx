import type { ReactNode } from 'react'

import type { Transaction } from '../../types/app'
import { UserTable } from './UserTable'

export function DashboardPage({
  transactions,
  onBookNow,
  onAccountInfo,
  onLogout,
  children,
}: {
  transactions: Transaction[]
  onBookNow: () => void
  onAccountInfo: () => void
  onLogout: () => void
  children?: ReactNode
}) {
  return (
    <main className="dashboard-page">
      <header className="dashboard-nav">
        <div className="brand">World Concord</div>
        <nav className="nav-links">
          <button type="button" className="link-button nav-link" onClick={onAccountInfo}>
            Account Info
          </button>
          <span className="nav-divider" aria-hidden="true" />
          <button type="button" className="link-button nav-link" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-toolbar">
          <h2>Transactions</h2>
          <button type="button" className="book-now-pill" onClick={onBookNow}>
            Book Now
          </button>
        </div>

        <UserTable transactions={transactions} />
      </section>

      {children}
    </main>
  )
}
