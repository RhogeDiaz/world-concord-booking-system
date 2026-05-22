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
  const [showTermsModal, setShowTermsModal] = useState(false)
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
    id: shipment.id,
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

  const handleUpdatePickupDate = async (transactionId: number, newPickupDate: string) => {
    await api.updateShipment(transactionId, {
      pickup_date: newPickupDate,
      status_label: 'Schedule Updated',
    })
    await loadTransactions()
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
                I have read and agree to the{' '}
                <a href="#" onClick={(event) => {
                  event.preventDefault()
                  setShowTermsModal(true)
                }}>
                  terms and conditions
                </a>{' '}
                of World Concord International Link Corporation.
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
          onUpdatePickupDate={handleUpdatePickupDate}
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
      {/* TERMS AND CONDITIONS */}
      {showTermsModal ? (
        <div className="modal-backdrop admin-date-editor-backdrop" role="presentation" onClick={() => setShowTermsModal(false)}>
          <section
            className="booking-modal admin-date-editor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="terms-modal-title">Terms and Conditions</h2>
            <div className="field">
              <h3>Agreement to Terms</h3>
              <p className="para">These Terms of Service constitute a legally binding agreement between you, whether personally or on behalf of an entity (“you”), and World Concord (“we,” “us,” or “our”), concerning your access to and use of the website, including any related media, mobile applications, or services (collectively, the “Site”). By accessing the Site, you confirm that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with these Terms, you are prohibited from using the Site and must discontinue use immediately.</p>
              <p className="para">Supplemental terms or policies posted on the Site are incorporated by reference. We reserve the right to modify these Terms at our sole discretion by updating the “Last Updated” date. Your continued use of the Site after such changes constitutes acceptance of the revised Terms. It is your responsibility to review these Terms periodically.</p>
              <p className="para">If you access the Site from a jurisdiction where its use is contrary to local laws, you are solely responsible for compliance with those laws.</p>

              <h3>1. Use of the Site</h3>
              <p className="para">The Site is provided for your personal and informational use. You agree to:</p>
              <ul>
                <li>Use the Site in compliance with all applicable laws and these Terms.</li>
                <li>Maintain the confidentiality of your account credentials and accept responsibility for all activities under your account.</li>
                <li>Provide true, accurate, current, and complete registration information and update it as necessary.</li>
              </ul>
              <p className="para">You are prohibited from:</p>
              <ul>
                <li>Using the Site for any illegal or unauthorized purpose.</li>
                <li>Accessing the Site through automated means (e.g., bots, scripts) without permission.</li>
                <li>Systematically retrieving data to create collections or databases without our written consent.</li>
                <li>Engaging in activities that harm the Site, such as uploading viruses or interfering with security features.</li>
                <li>Impersonating another user, manipulating prices, or collecting user data without authorization.</li>
              </ul>
              <p className="para">We may suspend or terminate your account for violations of these Terms.</p>

              <h3>2. Intellectual Property Rights</h3>
              <p className="para">All content on the Site, including text, graphics, logos, software, and documentation, is the property of World Concord or its licensors and is protected by international copyright, trademark, and patent laws. You may not reproduce, modify, distribute, or create derivative works from any content without our prior written consent, except as permitted by law.</p>
              <p className="para">We respect the intellectual property rights of others and expect users to do the same. We will investigate reports of infringement and take appropriate action, including legal proceedings if necessary. To report suspected violations, contact us at johncarlocarcedo7@gmail.com.</p>

              <h3>3. User Representations</h3>
              <p className="para">By using the Site, you represent and warrant that:</p>
              <ul>
                <li>All information you provide is true, accurate, current, and complete.</li>
                <li>You will maintain and update this information as needed.</li>
                <li>You have the legal capacity to enter into these Terms.</li>
                <li>You will not use the Site for illegal purposes or in violation of any applicable laws.</li>
                <li>You will not use automated tools or scripts to access the Site without authorization.</li>
              </ul>
              <p className="para">If you provide false or incomplete information, we may suspend or terminate your account.</p>

              <h3>4. User-Generated Contributions</h3>
              <p className="para">If you submit content to the Site (e.g., comments, feedback, or reviews, collectively “Contributions”), you grant us an unrestricted, perpetual, non-exclusive, royalty-free, worldwide license to use, reproduce, modify, publish, and distribute such Contributions for any purpose, including commercial use, in any media format. You represent and warrant that:</p>
              <ul>
                <li>Your Contributions do not infringe third-party rights (e.g., copyright, trademark, privacy).</li>
                <li>You are the creator or have necessary permissions to submit the Contributions.</li>
                <li>Your Contributions are not false, misleading, obscene, defamatory, or otherwise objectionable.</li>
                <li>Your Contributions comply with all applicable laws and these Terms.</li>
              </ul>
              <p className="para">We may edit, re-categorize, or remove Contributions at our discretion without notice. You remain solely responsible for your Contributions, and we are not liable for any statements therein.</p>

              <h3>5. Submissions</h3>
              <p className="para">Any questions, comments, suggestions, or feedback about the Site (“Submissions”) are non-confidential and become our sole property. We may use and disseminate Submissions for any lawful purpose without acknowledgment or compensation to you. You warrant that Submissions are original or that you have the right to submit them.</p>

              <h3>6. Payments and Invoicing</h3>
              <p className="para">Payment terms for purchases are at our sole discretion. Unless otherwise agreed, payment must be received before order fulfillment via credit card, PayPal, or wire transfer. Invoices are due within 15 days of the invoice date. We may cancel or deny orders due to pricing errors or other issues. For non-consumer purchases, we reserve the right to charge a late penalty of 1% per month (or the maximum permitted by law) on overdue amounts.</p>

              <h3>7. No Refund Policy</h3>
              <p className="para">All sales made through the Site are final, and World Concord does not offer refunds or returns under any circumstances, except as required by applicable law. If you have concerns about a purchase, please contact us at johncarlocarcedo7@gmail.com, but note that refunds will not be provided. All purchases are subject to a shipment contract, and the risk of loss and title for items pass to you upon delivery to the carrier.</p>

              <h3>8. Product Pricing and Descriptions</h3>
              <p className="para">Product prices are as displayed and may vary based on selected options. We may modify prices or pricing formulas at any time. In case of pricing errors, we may contact you for instructions or cancel the order. Product descriptions are provided for convenience, and we do not warrant their accuracy or completeness. If a product is not as described, your sole remedy is to contact us.</p>

              <h3>9. Third-Party Websites and Content</h3>
              <p className="para">The Site may include links to third-party websites or content for your convenience. We do not monitor, endorse, or control these websites or content and are not responsible for their accuracy, reliability, or any resulting loss or damage. Your use of third-party websites or content is at your own risk, and you should review their applicable terms and policies.</p>

              <h3>10. Advertisers</h3>
              <p className="para">We may allow advertisers to display advertisements on the Site. Advertisers are solely responsible for their advertisements and any products or services offered therein. We provide only the space for such advertisements and have no further relationship with advertisers.</p>

              <h3>11. User Data and Privacy</h3>
              <p className="para">We comply with applicable data protection laws, including the EU General Data Protection Regulation (GDPR). Our Privacy Policy, incorporated herein, governs the collection, use, and disclosure of your data. We collect only necessary data with your consent, implement security measures to protect it, and retain it only as long as needed. You have the right to access, rectify, or erase your data, subject to applicable laws. For details, see our Privacy Policy on the Site.</p>

              <h3>12. Electronic Communications and Transactions</h3>
              <p className="para">By using the Site, sending emails, or completing online forms, you consent to receive electronic communications from us. You agree that all agreements, notices, and disclosures provided electronically satisfy any legal requirement for written communication. You also consent to the use of electronic signatures, contracts, and records for transactions initiated via the Site.</p>

              <h3>13. Disclaimer of Warranties</h3>
              <p className="para">The Site and its content, services, and products are provided “as is” without warranties, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not guarantee that the Site will be uninterrupted, error-free, or secure. Your use of the Site is at your own risk.</p>

              <h3>14. Limitation of Liability</h3>
              <p className="para">To the fullest extent permitted by law, World Concord, its directors, employees, or agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits or data, arising from your use of the Site, even if advised of such damages. Our aggregate liability shall not exceed the amount paid by you for the services or products giving rise to the claim.</p>

              <h3>15. Indemnification</h3>
              <p className="para">You agree to indemnify and hold harmless World Concord, its officers, directors, employees, and agents from any claims, damages, losses, or expenses, including reasonable attorneys’ fees, arising from your use of the Site or violation of these Terms, except to the extent caused by our gross negligence or willful misconduct.</p>

              <h3>16. Fraud and Prohibited Activities</h3>
              <p className="para">We monitor for fraudulent activities and may pursue all legal remedies if fraud is detected. You are liable for costs and legal fees arising from such activities. Prohibited activities include price manipulation, unauthorized data collection, or actions that disrupt the Site’s functionality.</p>

              <h3>17. Confidentiality</h3>
              <p className="para">You agree not to disclose or exploit confidential information obtained from us, our clients, or suppliers, including customer data, without our express consent.</p>

              <h3>18. Modifications and Interruptions</h3>
              <p className="para">We may modify, suspend, or discontinue the Site or its content at any time without notice. We are not liable for any loss or inconvenience caused by such changes or interruptions, including those due to maintenance or technical issues.</p>

              <h3>19. Governing Law and Jurisdiction</h3>
              <p className="para">These Terms are governed by the laws of Philippines, without regard to conflict-of-laws principles. Any disputes arising from these Terms or the Site shall be resolved exclusively in the courts of Hong Kong. You waive objections to jurisdiction or venue in such courts. We may pursue legal action against you in your country of residence or other relevant jurisdictions for breaches of these Terms.</p>

              <h3>20. Dispute Resolution</h3>
              <p className="para">Please contact us at johncarlocarcedo7@gmail.com to raise any concerns.</p>

              <h3>21. Miscellaneous</h3>
              <ul>
                <li className="para">Entire Agreement: These Terms, along with any posted policies, constitute the entire agreement between you and us, superseding prior agreements.</li>
                <li className="para">Non-Assignment: You may not assign your rights under these Terms without our consent. We may assign these Terms at our discretion.</li>
                <li className="para">Severability: If any provision is found invalid or unenforceable, it will be enforced to the maximum extent permitted, and other provisions remain in effect.</li>
                <li className="para">Non-Waiver: Our failure to enforce any provision does not waive that or any other provision.</li>
                <li className="para">Corrections: We may correct errors or inaccuracies on the Site without prior notice.</li>
              </ul>

              <h3>22. Contact Us</h3>
              <p className="para">For questions or concerns about these Terms, contact us at johncarlocarcedo7@gmail.com.</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-pill" onClick={() => setShowTermsModal(false)}>
                Close
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
