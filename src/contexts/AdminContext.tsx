/**
 * 管理者コンテキスト
 * 
 * 管理者権限と管理者リストの管理を提供します。
 */

import { createContext, useContext, type ReactNode } from 'react'
import { useAdmin } from '../hooks/useAdmin'

interface AdminContextType {
  isAdmin: boolean
  adminList: string[]
  isLoading: boolean
  refetch: () => void
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const adminData = useAdmin()
  
  return (
    <AdminContext.Provider value={adminData}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdminContext() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminProvider')
  }
  return context
}

