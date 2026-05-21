export function ConfirmationModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="confirmation-modal">
        <p className="modal-title">{title}</p>
        <p className="modal-message">{message}</p>
        <div className="modal-buttons">
          <button type="button" className="modal-button modal-button-yes" onClick={onConfirm}>
            Yes
          </button>
          <button type="button" className="modal-button modal-button-no" onClick={onCancel}>
            No
          </button>
        </div>
      </div>
    </div>
  )
}
