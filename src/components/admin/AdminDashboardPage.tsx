import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { api } from '../../api/client'
import { AdminBookingsIcon, AdminCalendarIcon, AdminCheckIcon } from './AdminIcons'

interface AdminMetrics {
  total_bookings: number
  daily_bookings: number
}

interface MonthlyData {
  month: number
  month_name: string
  requests: number
  accepted: number
}

export function AdminDashboardPage({ onLogout, onBookings }: { onLogout: () => void; onBookings: () => void }) {
  const currentYear = new Date().getFullYear()

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch available years (only on first load)
        if (availableYears.length === 0) {
          const years = await api.getAdminYears()
          setAvailableYears(years)
          // Set selected year to first available year if not current year
          if (years.length > 0 && !years.includes(currentYear)) {
            setSelectedYear(years[0])
          }
        }

        // Fetch metrics for selected year
        const metricsData = await api.getAdminMetrics(selectedYear)
        setMetrics(metricsData)

        // Fetch monthly data for selected year
        const monthlyChartData = await api.getAdminMonthly(selectedYear)
        setMonthlyData(monthlyChartData)
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch dashboard data:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedYear, availableYears.length])

  const summaryCards = metrics
    ? [
        { label: 'Total Bookings', value: metrics.total_bookings, icon: 0 },
        { label: 'Daily Bookings (Avg)', value: metrics.daily_bookings.toFixed(2), icon: 1 },
        { label: 'Monthly Booking Requests', value: monthlyData.reduce((sum, m) => sum + m.requests, 0), icon: 2 },
        { label: 'Monthly Bookings Accepted', value: monthlyData.reduce((sum, m) => sum + m.accepted, 0), icon: 3 },
      ]
    : []

  return (
    <main className="admin-page">
      <header className="admin-nav">
        <div className="admin-brand">DASHBOARD</div>
        <nav className="nav-links">
          <button type="button" className="link-button nav-link" onClick={onBookings}>
            Bookings
          </button>
          <span className="nav-divider" aria-hidden="true" />
          <button type="button" className="link-button nav-link admin-logout" onClick={onLogout}>
            Log out
          </button>
        </nav>
      </header>

      <section className="admin-content">
        <div className="admin-toolbar">
          <label htmlFor="year-select" className="year-label">
            Data for Year
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="year-select"
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
            
          </select>
        </div>

        {error && (
          <div className="admin-error">
            <p>Error: {error}</p>
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <>
            <section className="admin-stats-grid">
              {summaryCards.map((card) => (
                <article className="admin-stat-card" key={card.label}>
                  <div className="admin-stat-icon">
                    {card.icon === 0 && <AdminBookingsIcon />}
                    {card.icon === 1 && <AdminCalendarIcon />}
                    {card.icon === 2 && <AdminCalendarIcon />}
                    {card.icon === 3 && <AdminCheckIcon />}
                  </div>
                  <p className="admin-stat-label">{card.label}</p>
                  <p className="admin-stat-value">{card.value}</p>
                </article>
              ))}
            </section>

            <section className="admin-chart-card">
              <h3>Number of Booking Request per Month</h3>
              <div className="admin-chart-wrap">
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="adminBookingFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2d5be3" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2d5be3" stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f3" vertical={false} />
                    <XAxis dataKey="month_name" stroke="#6b7fa5" tickLine={false} axisLine={false} />
                    <YAxis
                      domain={[0, 'auto']}
                      stroke="#6b7fa5"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '14px',
                        border: '1px solid rgba(26, 58, 143, 0.12)',
                        boxShadow: '0 14px 28px rgba(26, 58, 143, 0.12)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="#1a3a8f"
                      strokeWidth={3}
                      fill="url(#adminBookingFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  )
}
