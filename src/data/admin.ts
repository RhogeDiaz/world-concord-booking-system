import type { AdminBookingRecord, AdminStatCard, MonthlyBookingPoint, MonthName } from '../types/admin'

export const adminSummaryCards: AdminStatCard[] = [
  // TODO: Replace with DB query
  { label: 'Total Booking Request', value: '1,614' },
  // TODO: Replace with DB query
  { label: 'Daily Booking Request', value: '23' },
  // TODO: Replace with DB query
  { label: 'Average Booking Request per Month', value: '322.8' },
  // TODO: Replace with DB query
  { label: 'Average Accepted Booking Request per Month', value: '307' },
]

export const adminMonthlyBookingData: MonthlyBookingPoint[] = [
  { month: 'Jan', requests: 120, accepted: 114 },
  { month: 'Feb', requests: 160, accepted: 149 },
  { month: 'Mar', requests: 205, accepted: 191 },
  { month: 'Apr', requests: 250, accepted: 238 },
  { month: 'May', requests: 285, accepted: 270 },
  { month: 'Jun', requests: 325, accepted: 309 },
  { month: 'Jul', requests: 372, accepted: 355 },
  { month: 'Aug', requests: 418, accepted: 401 },
  { month: 'Sep', requests: 478, accepted: 456 },
  { month: 'Oct', requests: 533, accepted: 507 },
  { month: 'Nov', requests: 590, accepted: 566 },
  { month: 'Dec', requests: 640, accepted: 615 },
]

const adminBookingDates = [
  '2024-01-05',
  '2024-01-11',
  '2024-01-18',
  '2024-01-22',
  '2024-02-03',
  '2024-02-09',
  '2024-02-14',
  '2024-02-25',
  '2024-03-02',
  '2024-03-08',
  '2024-03-12',
  '2024-03-21',
  '2024-04-02',
  '2024-04-07',
  '2024-04-15',
  '2024-04-27',
  '2024-05-04',
  '2024-05-10',
  '2024-05-18',
  '2024-05-29',
  '2024-06-03',
  '2024-06-11',
  '2024-06-19',
  '2024-06-28',
  '2024-07-02',
  '2024-07-09',
  '2024-07-17',
  '2024-07-24',
  '2024-08-06',
  '2024-08-15',
]

const adminStatuses = [
  'Accepted',
  'Moved',
  'Rejected',
  'Picked Up',
  'Shipped',
  'Arrived in Port',
  'Departed',
  'Dropped Off',
  'Completed',
]

const adminPickupLocations = [
  'Davao City Port, Philippines',
  'Cebu Port, Philippines',
  'Manila North Harbor, Philippines',
  'Batangas Port, Philippines',
  'Iloilo Port, Philippines',
]

const adminDropoffLocations = [
  'Singapore PSA, Singapore',
  'Port Klang, Malaysia',
  'Hong Kong Terminal, China',
  'Busan Port, South Korea',
  'Jakarta Port, Indonesia',
]

export const adminBookingRows: AdminBookingRecord[] = adminBookingDates.map((datePickedUp, index) => {
  // TODO: Replace with DB query
  const monthKey = new Date(datePickedUp).toLocaleString('en-US', { month: 'short' }) as MonthName

  return {
    transactionNumber: `ADM-${String(index + 1).padStart(4, '0')}`,
    pickupLocation: adminPickupLocations[index % adminPickupLocations.length],
    dropoffLocation: adminDropoffLocations[index % adminDropoffLocations.length],
    datePickedUp,
    status: adminStatuses[index % adminStatuses.length],
    month: monthKey,
  } as AdminBookingRecord & { month: MonthName }
})
