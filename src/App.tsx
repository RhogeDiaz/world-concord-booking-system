import './App.css'
import { useEffect, useState } from 'react'

import { api } from './api/client'
import { AuthCard } from './components/auth/AuthCard'
import { AdminBookingsPage } from './components/admin/AdminBookingsPage'
import { AdminDashboardPage } from './components/admin/AdminDashboardPage'
import { AccountInfoPage } from './components/account/AccountInfoPage'
import { BookingModal } from './components/booking/BookingModal'
import { DashboardPage } from './components/dashboard/DashboardPage'
import { initialTransactions } from './data/transactions'
import { FaEyeSlash } from "react-icons/fa";
import { FaEye } from "react-icons/fa";
import type {
  BookingLocationField,
  BookingLocationInputs,
  MapLocation,
  Page,
  Transaction,
} from './types/app'

function PasswordField({
  value,
  onChange,
  placeholder,
  visible,
  onToggleVisible,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  visible: boolean
  onToggleVisible: () => void
}) {
  return (
    <div className="password-field-wrap">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      <button type="button" className="password-toggle-button" onClick={onToggleVisible} aria-label={visible ? 'Hide password' : 'Show password'}>
        <span aria-hidden="true">{visible ? <FaEye /> : <FaEyeSlash />}</span>
      </button>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signupUsername, setSignupUsername] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupCompanyName, setSignupCompanyName] = useState('')
  const [signupCompanyAddress, setSignupCompanyAddress] = useState('')
  const [signupCompanyEmail, setSignupCompanyEmail] = useState('')
  const [signupCompanyNumber, setSignupCompanyNumber] = useState('')
  const [signupError, setSignupError] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verificationPreview, setVerificationPreview] = useState<string | null>(null)
  const [devVerificationCode, setDevVerificationCode] = useState<string | null>(null)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingLocations, setBookingLocations] = useState<Record<BookingLocationField, MapLocation | null>>({
    pickup: null,
    dropoff: null,
  })
  const [bookingLocationInputs, setBookingLocationInputs] = useState<BookingLocationInputs>({
    pickup: '',
    dropoff: '',
  })
  const [activeLocationField, setActiveLocationField] = useState<BookingLocationField | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)

  const mapShipmentToTransaction = (shipment: any): Transaction => ({
    number: shipment.transport_number || `WC-${shipment.id}`,
    transportNumber: shipment.transport_number || 'N/A',
    destinationPort: shipment.destination_port_name || 'N/A',
    departurePort: shipment.departure_port_name || 'N/A',
    container20: Number(shipment.container_20 ?? 0),
    container40: Number(shipment.container_40 ?? 0),
    typeOfGoods: shipment.type_of_goods_id === 1 ? 'perishable' : shipment.type_of_goods_id === 0 ? 'non-perishable' : 'N/A',
    fslType: shipment.fsl_type || 'N/A',
    pickup: shipment.pickup_location || 'N/A',
    dropoff: shipment.dropoff_location || 'N/A',
    actualTimeDeparture: shipment.actual_time_departure || 'N/A',
    bookDate: shipment.book_date || 'N/A',
    pickupDate: shipment.pickup_date || 'N/A',
    status: shipment.status_label || 'Pending',
    amountPayable: Number(shipment.amount ?? 0),
  })

  const loadTransactions = async () => {
    try {
      const shipmentRows = await api.getShipments()
      setTransactions((shipmentRows || []).map(mapShipmentToTransaction))
    } catch {
      setTransactions(initialTransactions)
    }
  }

  useEffect(() => {
    if (page !== 'dashboard') return undefined

    void loadTransactions()
    const intervalId = window.setInterval(() => {
      void loadTransactions()
    }, 20000)

    return () => window.clearInterval(intervalId)
  }, [page])

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError('Enter your email or phone number and password to continue.')
      return
    }

    setLoginError('')
    setIsLoading(true)

    try {
      const loginResult = await api.login({ username: email, password })

      if ((loginResult as any)?.is_admin) {
        setPage('adminDashboard')
      } else {
        setPage('dashboard')
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignup = async () => {
    if (!signupUsername.trim() || !signupPassword.trim() || !signupCompanyName.trim()) {
      setSignupError('Please fill in all required fields.')
      return
    }

    const companyEmail = signupCompanyEmail.trim()
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
      setSignupError('Enter a valid company email address.')
      return
    }

    setSignupError('')
    setIsLoading(true)

    try {
      const reg = await api.register({
        username: signupUsername,
        password: signupPassword,
        company_name: signupCompanyName,
        company_address: signupCompanyAddress || undefined,
        company_phone: signupCompanyNumber || undefined,
        company_email: companyEmail || undefined,
      })
      // If the server returned a preview link (dev ethereal), store it
      if (reg && (reg as any).verification_preview) setVerificationPreview((reg as any).verification_preview)
      if (reg && (reg as any).verification_code) setDevVerificationCode((reg as any).verification_code)
      // After signup, proceed to OTP verification
      setPage('otp')
    } catch (err: any) {
      setSignupError(err.message || 'Registration failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    api.logout()
    setBookingOpen(false)
    setActiveLocationField(null)
    setEmail('')
    setPassword('')
    setLoginError('')
    setSignupUsername('')
    setSignupPassword('')
    setSignupCompanyName('')
    setSignupCompanyAddress('')
    setSignupCompanyEmail('')
    setSignupCompanyNumber('')
    setSignupError('')
    setShowLoginPassword(false)
    setShowSignupPassword(false)
    setTransactions(initialTransactions)
    setPage('login')
  }

  return (
    <div className="app-shell">
      {page === 'login' && (
        <AuthCard title="Log In">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleLogin()
            }}
          >
            <label className="field">
              <span>Email or Phone Number</span>
              <input
                type="text"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email or phone number"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <PasswordField
                value={password}
                onChange={setPassword}
                placeholder="Enter your password"
                visible={showLoginPassword}
                onToggleVisible={() => setShowLoginPassword((current) => !current)}
              />
            </label>
            {loginError ? <p className="auth-error">{loginError}</p> : null}
            <div className="auth-links">
              <button type="button" className="link-button subtle-link">
                Forgot password?
              </button>
              <button type="button" className="link-button" onClick={() => setPage('signup')}>
                Don&apos;t have an account? Sign up
              </button>
            </div>
            <button type="submit" className="primary-pill" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Log in'}
            </button>
            {/* <div className="page-switch">
              <button type="button" className="link-button" onClick={() => setPage('otp')}>
                Go to OTP verification
              </button>
            </div> */}
          </form>
        </AuthCard>
      )}

      {page === 'signup' && (
        <AuthCard title="Create Account">
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void handleSignup()
            }}
          >
            <label className="field">
              <span>Username</span>
              <input
                type="text"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="Choose a username"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <PasswordField
                value={signupPassword}
                onChange={setSignupPassword}
                placeholder="Create a password"
                visible={showSignupPassword}
                onToggleVisible={() => setShowSignupPassword((current) => !current)}
              />
            </label>

            <label className="field">
              <span>Company Name</span>
              <input
                type="text"
                value={signupCompanyName}
                onChange={(e) => setSignupCompanyName(e.target.value)}
                placeholder="Company name"
              />
            </label>

            <label className="field">
              <span>Company Address</span>
              <input
                type="text"
                value={signupCompanyAddress}
                onChange={(e) => setSignupCompanyAddress(e.target.value)}
                placeholder="Street, city, country"
              />
            </label>

            <label className="field">
              <span>Company Email</span>
              <input
                type="email"
                autoComplete="email"
                value={signupCompanyEmail}
                onChange={(e) => setSignupCompanyEmail(e.target.value)}
                placeholder="company@example.com"
              />
            </label>

            <label className="field">
              <span>Company Number</span>
              <input
                type="tel"
                value={signupCompanyNumber}
                onChange={(e) => setSignupCompanyNumber(e.target.value)}
                placeholder="+63"
              />
            </label>

            <label className="checkbox-row">
              <input type="checkbox" />
              <span>
                I have read and agree the terms and conditions of World Concord International Link
                Corporation.
              </span>
            </label>

            {signupError ? <p className="auth-error">{signupError}</p> : null}

            <button type="submit" className="primary-pill" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className="page-switch">
              <button type="button" className="link-button" onClick={() => setPage('login')}>
                Back to Log In
              </button>
            </div>
          </form>
        </AuthCard>
      )}

      {page === 'otp' && (
        <AuthCard title="Verify Account">
          <p className="center-copy">
            We have sent a code to your email and phone number. Please enter the code to verify.
          </p>
          <label className="field">
            <span>Code</span>
            <input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} type="text" placeholder="Enter the code here." />
          </label>
          {devVerificationCode ? (
            <p className="small-copy">Dev code: <strong>{devVerificationCode}</strong></p>
          ) : null}
          <button type="button" className="primary-pill" onClick={async () => {
            setVerificationError('')
            try {
              const verifyResult = await api.verifyAccount(signupUsername, verificationCode)
              // Only clear fields on success
              setSignupUsername('')
              setSignupPassword('')
              setSignupCompanyName('')
              setSignupCompanyAddress('')
              setSignupCompanyEmail('')
              setSignupCompanyNumber('')
              setSignupError('')
              setDevVerificationCode(null)
              setVerificationCode('')
              if ((verifyResult as any)?.is_admin) {
                setPage('adminDashboard')
              } else {
                setPage('dashboard')
              }
            } catch (err: any) {
              setVerificationError(err.message || 'Verification failed')
            }
          }}>
            Confirm
          </button>
          {verificationError ? <p className="auth-error">{verificationError}</p> : null}
          {verificationPreview ? (
            <p className="small-copy">Dev preview: <a href={verificationPreview} target="_blank" rel="noreferrer">Open email</a></p>
          ) : null}
          <div style={{ marginTop: 8 }}>
            <button type="button" className="link-button" onClick={async () => {
              try {
                const res = await api.resendVerification(signupUsername)
                if (res && res.verification_preview) setVerificationPreview(res.verification_preview)
                if (res && res.verification_code) setDevVerificationCode(res.verification_code)
              } catch (e) {
                setVerificationError((e as any).message || 'Failed to resend')
              }
            }}>Resend code</button>
          </div>
          <div className="page-switch">
            <button type="button" className="link-button" onClick={() => setPage('login')}>
              Return to Log In
            </button>
          </div>
        </AuthCard>
      )}

      {page === 'dashboard' && (
        <DashboardPage
          transactions={transactions}
          onBookNow={() => setBookingOpen(true)}
          onAccountInfo={() => setPage('accountInfo')}
          onLogout={handleLogout}
        >
          {bookingOpen && (
            <BookingModal
              bookingLocations={bookingLocations}
              bookingLocationInputs={bookingLocationInputs}
              activeLocationField={activeLocationField}
              onOpenLocationPicker={setActiveLocationField}
              onCloseLocationPicker={() => setActiveLocationField(null)}
              onLocationSelect={(field, location) => {
                setBookingLocations((currentLocations) => ({
                  ...currentLocations,
                  [field]: location,
                }))
                setBookingLocationInputs((currentInputs) => ({
                  ...currentInputs,
                  [field]: location.label,
                }))
              }}
              onLocationInputChange={(field, value) =>
                setBookingLocationInputs((currentInputs) => ({
                  ...currentInputs,
                  [field]: value,
                }))
              }
              onBooked={loadTransactions}
              onClose={() => {
                setBookingOpen(false)
                setActiveLocationField(null)
              }}
            />
          )}
        </DashboardPage>
      )}

      {page === 'accountInfo' && (
        <AccountInfoPage
          onReturn={() => setPage('dashboard')}
          onLogout={handleLogout}
        />
      )}

      {page === 'adminDashboard' && (
        <AdminDashboardPage onLogout={handleLogout} onBookings={() => setPage('adminBookings')} />
      )}

      {page === 'adminBookings' && (
        <AdminBookingsPage onBack={() => setPage('adminDashboard')} onLogout={handleLogout} />
      )}
    </div>
  )
}

export default App
