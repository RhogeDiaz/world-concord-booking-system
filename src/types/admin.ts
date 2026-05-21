export type MonthName =
  | 'Jan'
  | 'Feb'
  | 'Mar'
  | 'Apr'
  | 'May'
  | 'Jun'
  | 'Jul'
  | 'Aug'
  | 'Sep'
  | 'Oct'
  | 'Nov'
  | 'Dec'

export type AdminStatCard = {
  label: string
  value: string
}

export type AdminMetrics = {
  total_bookings: number
  daily_bookings: number
}

export type MonthlyBookingPoint = {
  month: number
  month_name: string
  requests: number
  accepted: number
}

export type AdminBookingRecord = {
  transactionNumber: string
  pickupLocation: string
  dropoffLocation: string
  datePickedUp: string
  status: string
  month: MonthName
}

export type Port = {
  id: number
  port_name: string
}

export type AdminBooking = {
  id: number
  shipper: number
  destination_port: number
  departure_port: number
  transport_number: string | null
  mbl_number: string | null
  fsl_type: string | null
  container_20: number
  container_40: number
  type_of_goods_id: number | null
  actual_time_departure: string | null
  pickup_location: string | null
  dropoff_location: string | null
  pickup_date: string | null
  book_date: string | null
  shipper_name: string
  departure_port_name: string | null
  destination_port_name: string | null
  status_label: string | null
  status: number | null
  status_id?: number | null
  amount?: number | null
}
