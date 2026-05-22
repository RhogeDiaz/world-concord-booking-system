export type Page = 'login' | 'signup' | 'otp' | 'dashboard' | 'accountInfo' | 'adminDashboard' | 'adminBookings'

export const statusOptions = [
  'Pending',
  'Accepted',
  'Moved',
  'Rejected',
  'Picked Up',
  'Shipped',
  'Arrived in Port',
  'Departed',
  'Dropped Off',
  'Completed',
  'Rescheduled',
  'Schedule Updated',
] as const

export type StatusOption = (typeof statusOptions)[number]

export type Transaction = {
  id: number
  number: string
  transportNumber: string
  destinationPort: string
  departurePort: string
  container20: number
  container40: number
  typeOfGoods: string
  fslType: string
  pickup: string
  dropoff: string
  actualTimeDeparture: string
  bookDate: string
  pickupDate: string
  status: StatusOption
  amountPayable?: number
}

export type BookingLocationField = 'pickup' | 'dropoff'

export type MapLocation = {
  lat: number
  lng: number
  label: string
}

export type BookingLocationInputs = Record<BookingLocationField, string>