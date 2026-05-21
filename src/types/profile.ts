export type UserProfile = {
  id: string
  username: string
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
}

export type ProfileUpdateRequest = {
  username?: string
  password?: string
  company_phone?: string
  company_email?: string
}
