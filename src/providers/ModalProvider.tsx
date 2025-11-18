'use client'

import Modal from '@/components/Modal'
import { Button } from '@/components/ui/forms'
import { createContext, type ReactNode, useContext, useState } from 'react'

interface ModalConfig {
  id: string
  title?: string
  children: ReactNode
  onClose?: () => void
}

interface ModalContextType {
  openModal: (config: Omit<ModalConfig, 'id'>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  isModalOpen: (id: string) => boolean
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

interface ModalProviderProps {
  children: ReactNode
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modals, setModals] = useState<ModalConfig[]>([])

  const openModal = (config: Omit<ModalConfig, 'id'>): string => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const newModal: ModalConfig = {
      id,
      ...config,
    }

    setModals((prev) => [...prev, newModal])
    return id
  }

  const closeModal = (id: string) => {
    setModals((prev) => {
      const modal = prev.find((m) => m.id === id)
      if (modal?.onClose) {
        modal.onClose()
      }
      return prev.filter((m) => m.id !== id)
    })
  }

  const closeAllModals = () => {
    setModals((prev) => {
      // Call onClose for each modal before closing
      prev.forEach((modal) => {
        if (modal.onClose) {
          modal.onClose()
        }
      })
      return []
    })
  }

  const isModalOpen = (id: string): boolean => {
    return modals.some((modal) => modal.id === id)
  }

  return (
    <ModalContext.Provider
      value={{
        openModal,
        closeModal,
        closeAllModals,
        isModalOpen,
      }}
    >
      {children}

      {/* Render all active modals */}
      {modals.map((modal) => (
        <Modal
          key={modal.id}
          isOpen={true}
          onClose={() => closeModal(modal.id)}
          title={modal.title}
        >
          {modal.children}
        </Modal>
      ))}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)

  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider')
  }

  return context
}

interface ConfirmModalProps {
  title?: string
  children: ReactNode
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
}

// Convenience hooks for common modal patterns
export function useConfirmModal() {
  const { openModal, closeModal } = useModal()

  const ConfirmModal = ({
    title,
    children,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
  }: ConfirmModalProps): string => {
    let modalId: string

    const handleConfirm = () => {
      closeModal(modalId)
      onConfirm()
    }

    const handleCancel = () => {
      closeModal(modalId)
      onCancel()
    }

    modalId = openModal({
      title,
      children: (
        <div className="space-y-4">
          {children}
          <div className="flex gap-3 justify-end">
            <Button type="button" color="secondary" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button type="button" color="primary" onClick={handleConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>
      ),
    })

    return modalId
  }

  return { ConfirmModal, openModal, closeModal }
}

export function useAlertModal() {
  const { openModal, closeModal } = useModal()

  const alertModal = (
    title: string,
    message: string,
    buttonText: string = 'OK'
  ): string => {
    let modalId: string

    const handleClose = () => {
      closeModal(modalId)
    }

    modalId = openModal({
      title,
      children: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">{message}</p>
          <div className="flex justify-end">
            <Button type="button" color="primary" onClick={handleClose}>
              {buttonText}
            </Button>
          </div>
        </div>
      ),
    })

    return modalId
  }

  return { alertModal }
}
