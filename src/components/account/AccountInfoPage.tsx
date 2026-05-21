import { useState, useEffect } from 'react'
import type { UserProfile } from '../../types/profile'
import { ConfirmationModal } from './ConfirmationModal'
import { api } from '../../api/client'

export function AccountInfoPage({
  onReturn,
  onLogout,
}: {
  onReturn: () => void
  onLogout: () => void
}) {
  const [selectedView, setSelectedView] = useState<'username' | 'company'>('username')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationType, setConfirmationType] = useState<'logout' | 'delete'>('logout')
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  // Username & Password state
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Company Info state
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')

  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true)
        const userProfile = await api.getProfile()
        setProfile(userProfile)
      } catch (err: any) {
        setError(err.message || 'Failed to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    void fetchProfile()
  }, [])

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) return
    try {
      setIsLoading(true)
      setError('')
      await api.updateUsername(newUsername)
      setSuccessMessage('Username updated successfully!')
      setNewUsername('')
      // Refresh profile
      const updatedProfile = await api.getProfile()
      setProfile(updatedProfile)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update username')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!newPassword.trim()) return
    try {
      setIsLoading(true)
      setError('')
      await api.updatePassword(newPassword)
      setSuccessMessage('Password updated successfully!')
      setNewPassword('')
      setShowNewPassword(false)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePhone = async () => {
    if (!newPhone.trim()) return
    try {
      setIsLoading(true)
      setError('')
      await api.updatePhone(newPhone)
      setSuccessMessage('Phone number updated successfully!')
      setNewPhone('')
      // Refresh profile
      const updatedProfile = await api.getProfile()
      setProfile(updatedProfile)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update phone')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) return
    try {
      setIsLoading(true)
      setError('')
      await api.updateEmail(newEmail)
      setSuccessMessage('Email updated successfully!')
      setNewEmail('')
      // Refresh profile
      const updatedProfile = await api.getProfile()
      setProfile(updatedProfile)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to update email')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      setIsLoading(true)
      setError('')
      await api.deleteAccount()
      setShowConfirmation(false)
      onLogout()
    } catch (err: any) {
      setError(err.message || 'Failed to delete account')
      setIsLoading(false)
    }
  }

  const handleConfirm = () => {
    if (confirmationType === 'logout') {
      onLogout()
    } else if (confirmationType === 'delete') {
      void handleDeleteAccount()
    }
    setShowConfirmation(false)
  }

  const openConfirmationHelper = (type: 'logout' | 'delete') => {
    setConfirmationType(type)
    setShowConfirmation(true)
  }

  if (isLoading && !profile) {
    return (
      <main className="account-info-page">
        <header className="account-info-nav">
          <div className="brand">World Concord</div>
          <button type="button" className="link-button nav-link" onClick={() => openConfirmationHelper('logout')}>
            Log out
          </button>
        </header>
        <div className="account-info-container">
          <aside className="account-sidebar" />
          <div className="account-content" style={{ display: 'grid', placeItems: 'center' }}>
            <p>Loading profile...</p>
          </div>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="account-info-page">
        <header className="account-info-nav">
          <div className="brand">World Concord</div>
          <button type="button" className="link-button nav-link" onClick={() => openConfirmationHelper('logout')}>
            Log out
          </button>
        </header>
        <div className="account-info-container">
          <aside className="account-sidebar" />
          <div className="account-content" style={{ display: 'grid', placeItems: 'center' }}>
            <p style={{ color: '#dc2626' }}>Failed to load profile</p>
            <button type="button" className="link-button" onClick={onReturn}>
              Return to Dashboard
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="account-info-page">
      <header className="account-info-nav">
        <div className="brand">World Concord</div>
        <button type="button" className="link-button nav-link" onClick={() => openConfirmationHelper('logout')}>
          Log out
        </button>
      </header>

      <div className="account-info-container">
        <aside className="account-sidebar">
          <button type="button" className="return-link" onClick={onReturn}>
            ← Return
          </button>

          <nav className="sidebar-nav">
            <button
              type="button"
              className={`sidebar-item ${selectedView === 'username' ? 'active' : ''}`}
              onClick={() => setSelectedView('username')}
            >
              Username & Password
            </button>
            <button
              type="button"
              className={`sidebar-item ${selectedView === 'company' ? 'active' : ''}`}
              onClick={() => setSelectedView('company')}
            >
              Company Information
            </button>
          </nav>

          <button type="button" className="logout-pill" onClick={() => openConfirmationHelper('logout')}>
            Log out
          </button>
        </aside>

        <div className="account-content">
          {error && <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>}
          {successMessage && <p style={{ color: '#059669', marginBottom: '16px' }}>{successMessage}</p>}

          {selectedView === 'username' && (
            <div className="content-section">
              <h2>Username & Password</h2>
              <div className="divider" />

              <div className="form-group">
                <label className="form-label">Current Username</label>
                <input type="text" value={profile?.username || ''} readOnly disabled className="form-input" />
              </div>

              <div className="form-group-with-button">
                <div className="form-group">
                  <label className="form-label">New Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter a new username"
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>
                <button type="button" className="update-pill" onClick={handleUpdateUsername} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>

              <div className="spacing-gap" />

              <div className="form-group">
                <label className="form-label">Current Password</label>
                <div className="password-field-wrap">
                  <input
                    type="password"
                    value="••••••••"
                    readOnly
                    disabled
                    className="form-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-button"
                    aria-label="Toggle password visibility"
                  >
                    👁️
                  </button>
                </div>
              </div>

              <div className="form-group-with-button">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <div className="password-field-wrap">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter a new password"
                      className="form-input"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle-button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      disabled={isLoading}
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <button type="button" className="update-pill" onClick={handleUpdatePassword} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>

              <div className="bottom-action">
                <button type="button" className="delete-pill" onClick={() => openConfirmationHelper('delete')} disabled={isLoading}>
                  Delete Account
                </button>
              </div>
            </div>
          )}

          {selectedView === 'company' && (
            <div className="content-section">
              <h2>Company Information</h2>
              <div className="divider" />

              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input
                  type="text"
                  value={profile?.company_name || ''}
                  readOnly
                  disabled
                  className="form-input"
                  placeholder="World Concord International Link Corporation"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Company Address</label>
                <input
                  type="text"
                  value={profile?.company_address || ''}
                  readOnly
                  disabled
                  className="form-input"
                  placeholder="Dizon Compound, Amazon St., Bacaca, Davao City, Philippines"
                />
              </div>

              <div className="form-group-with-button">
                <div className="form-group">
                  <label className="form-label">Current Company Phone Number</label>
                  <input
                    type="tel"
                    value={profile?.company_phone || ''}
                    readOnly
                    disabled
                    className="form-input"
                    placeholder="09123456789"
                  />
                </div>
              </div>

              <div className="form-group-with-button">
                <div className="form-group">
                  <label className="form-label">New Company Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Enter a company phone number"
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>
                <button type="button" className="update-pill" onClick={handleUpdatePhone} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Company Email</label>
                <input
                  type="email"
                  value={profile?.company_email || ''}
                  readOnly
                  disabled
                  className="form-input"
                  placeholder="worldconcord@email.com"
                />
              </div>

              <div className="form-group-with-button">
                <div className="form-group">
                  <label className="form-label">New Company Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter a new company email"
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>
                <button type="button" className="update-pill" onClick={handleUpdateEmail} disabled={isLoading}>
                  {isLoading ? 'Updating...' : 'Update'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showConfirmation}
        title={confirmationType === 'logout' ? 'Confirm Log Out' : 'Confirm Account Deletion'}
        message={
          confirmationType === 'logout'
            ? 'Are you sure you want to log out?'
            : 'Are you sure you want to delete your account? This action cannot be undone.'
        }
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmation(false)}
      />
    </main>
  )
}
