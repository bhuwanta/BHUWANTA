'use client'

import { useState, useEffect } from 'react'
import { listAdminUsers, addAdminUser, deleteAdminUser, changeAdminPassword, toggleAdminStatus, editAdminUser, getRoles, addRole, deleteRole, deleteAndReassignRole, sendPasswordResetEmail } from './actions'
import { Users, Loader2, Plus, Search, X, Eye, EyeOff, Shield, Trash2, Key, UserX, UserCheck, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'

type AdminUser = {
  id: string
  email?: string
  created_at: string
  last_sign_in_at?: string
  is_disabled?: boolean
  role?: string
  name?: string
}

export default function UsersClient({ userRole = 'Admin' }: { userRole?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roles, setRoles] = useState<{id: string, name: string}[]>([])
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null)
  
  // Add Role Modal
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [isAddingRole, setIsAddingRole] = useState(false)
  const [roleError, setRoleError] = useState('')

  // Delete Role Modal
  const [isDeleteRoleModalOpen, setIsDeleteRoleModalOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState('')
  const [fallbackRole, setFallbackRole] = useState('')
  const [isDeletingRole, setIsDeletingRole] = useState(false)
  const [deleteRoleError, setDeleteRoleError] = useState('')

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editError, setEditError] = useState('')
  const [selectedUserToEdit, setSelectedUserToEdit] = useState<AdminUser | null>(null)

  // Password Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  
  // Action State
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  async function fetchRoles() {
    const { data } = await getRoles()
    if (data) setRoles(data)
  }

  async function handleAddRole(e: React.FormEvent) {
    e.preventDefault()
    if (!newRoleName.trim()) return
    setIsAddingRole(true)
    setRoleError('')
    try {
      const result = await addRole(newRoleName.trim())
      if (result.error) {
        setRoleError(result.error)
      } else {
        await fetchRoles()
        setIsRoleModalOpen(false)
        setNewRoleName('')
        setRoleError('')
      }
    } catch (err) {
      setRoleError('An unexpected error occurred.')
    } finally {
      setIsAddingRole(false)
    }
  }

  async function handleDeleteRoleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!roleToDelete) return

    setIsDeletingRole(true)
    setDeleteRoleError('')

    const roleObj = roles.find(r => r.id === roleToDelete)
    if (!roleObj) {
      setDeleteRoleError('Role not found.')
      setIsDeletingRole(false)
      return
    }

    const roleName = roleObj.name
    const usersWithRole = users.filter(u => u.role === roleName)

    if (usersWithRole.length > 0 && !fallbackRole) {
      setDeleteRoleError(`There are ${usersWithRole.length} users with this role. Please select a fallback role to reassign them to.`)
      setIsDeletingRole(false)
      return
    }

    try {
      const fallbackRoleName = fallbackRole ? roles.find(r => r.id === fallbackRole)?.name || null : null
      const result = await deleteAndReassignRole(roleToDelete, roleName, fallbackRoleName)
      
      if (result.error) {
        setDeleteRoleError(result.error)
      } else {
        if (activeRoleFilter === roleName) {
          setActiveRoleFilter(null)
        }
        await fetchRoles()
        await fetchUsers()
        setIsDeleteRoleModalOpen(false)
        setRoleToDelete('')
        setFallbackRole('')
      }
    } catch (err) {
      setDeleteRoleError('An unexpected error occurred while deleting the role.')
    } finally {
      setIsDeletingRole(false)
    }
  }

  useEffect(() => {
    let filtered = users
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase()
      filtered = filtered.filter(u => u.email?.toLowerCase().includes(lowerQ) || u.name?.toLowerCase().includes(lowerQ))
    }
    if (activeRoleFilter) {
      filtered = filtered.filter(u => u.role === activeRoleFilter)
    }
    setFilteredUsers(filtered)
    setCurrentPage(1)
  }, [searchQuery, users, activeRoleFilter])

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const result = await listAdminUsers()
      if (result.error) {
        setFetchError(result.error)
      } else if (result.users) {
        setUsers(result.users)
        setFilteredUsers(result.users)
      }
    } catch (err) {
      setFetchError('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsAdding(true)
    setAddError('')

    const formData = new FormData(e.currentTarget)
    
    try {
      const result = await addAdminUser(formData)
      if (result.error) {
        setAddError(result.error)
      } else {
        await fetchUsers()
        closeModal()
      }
    } catch (err) {
      setAddError('An unexpected error occurred while creating the user.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedUserToEdit) return

    setIsEditing(true)
    setEditError('')
    
    const formData = new FormData(e.currentTarget)
    formData.append('id', selectedUserToEdit.id)
    
    try {
      const res = await editAdminUser(formData)
      if (res.error) {
        setEditError(res.error)
      } else {
        setIsEditModalOpen(false)
        fetchUsers()
      }
    } catch (err) {
      setEditError('An unexpected error occurred while updating the user.')
    } finally {
      setIsEditing(false)
    }
  }

  const openModal = () => {
    setAddError('')
    setShowPassword(false)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
  }

  const openPasswordModal = (userId: string) => {
    setSelectedUserId(userId)
    setPasswordError('')
    setShowPassword(false)
    setIsPasswordModalOpen(true)
  }

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false)
    setSelectedUserId(null)
  }

  const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedUserId) return

    setIsChangingPassword(true)
    setPasswordError('')

    const formData = new FormData(e.currentTarget)
    formData.append('id', selectedUserId)
    
    try {
      const result = await changeAdminPassword(formData)
      if (result.error) {
        setPasswordError(result.error)
      } else {
        alert('Password changed successfully')
        closePasswordModal()
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSendResetEmail = async () => {
    if (!selectedUserId) return
    
    setIsSendingReset(true)
    setPasswordError('')
    
    const userToReset = users.find(u => u.id === selectedUserId)
    if (!userToReset || !userToReset.email) {
      setPasswordError('User email not found')
      setIsSendingReset(false)
      return
    }

    try {
      const res = await sendPasswordResetEmail(userToReset.email)
      if (res.error) {
        setPasswordError(res.error)
      } else {
        closePasswordModal()
        // Optional: show a success toast here if you have a toast library
        alert('Password reset email sent successfully!')
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email')
    } finally {
      setIsSendingReset(false)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this admin user?')) return

    setActionLoadingId(userId)
    try {
      const result = await deleteAdminUser(userId)
      if (result.error) {
        alert(result.error)
      } else {
        await fetchUsers()
      }
    } catch (err) {
      alert('Failed to delete user.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleToggleStatus = async (userId: string, currentDisabled: boolean) => {
    setActionLoadingId(userId)
    try {
      const result = await toggleAdminStatus(userId, !currentDisabled)
      if (result.error) {
        alert(result.error)
      } else {
        await fetchUsers()
      }
    } catch (err) {
      alert('Failed to update user status.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Users</h1>
          <p className="mt-2 text-sm text-[#5a6a82]">
            Manage users with access to this dashboard.
          </p>
        </div>
        {userRole === 'Super Admin' && (
          <button
            onClick={openModal}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#c4a55a] to-[#b3954c] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {/* Roles Filter Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setActiveRoleFilter(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!activeRoleFilter ? 'bg-[#1e3a5f] text-white' : 'bg-white border border-[#e8ecf2] text-[#5a6a82] hover:bg-[#f8fafc]'}`}
        >
          All
        </button>
        {roles.map(role => {
          return (
            <div key={role.id} className="relative group flex items-center">
              <button
                onClick={() => setActiveRoleFilter(role.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeRoleFilter === role.name ? 'bg-[#1e3a5f] text-white shadow-md' : 'bg-white border border-[#e8ecf2] text-[#5a6a82] hover:bg-[#f8fafc]'}`}
              >
                {role.name}
              </button>
            </div>
          )
        })}
        {userRole === 'Super Admin' && (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => {
                setDeleteRoleError('')
                setRoleToDelete('')
                setFallbackRole('')
                setIsDeleteRoleModalOpen(true)
              }}
              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-dashed border-red-400 text-red-500 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete Role
            </button>
            <button
              onClick={() => setIsRoleModalOpen(true)}
              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-dashed border-[#c4a55a] text-[#c4a55a] hover:bg-[#c4a55a]/5 transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Role
            </button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e8ecf2] bg-white flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5a6a82]" />
            <input
              type="text"
              placeholder="Search by email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] text-sm text-[#0f1d33] focus:border-[#1e3a5f] outline-none transition-colors"
            />
          </div>
          <div className="text-sm text-[#5a6a82] font-medium whitespace-nowrap">
            Total Admins: {filteredUsers.length}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
            </div>
          ) : fetchError ? (
            <div className="p-8 text-center text-sm text-red-600">
              {fetchError}
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-[#f7f8fa] border-b border-[#e8ecf2]">
                <tr>
                  <th className="px-6 py-4 font-medium text-[#0f1d33] w-16">Sr.No</th>
                  <th className="px-6 py-4 font-medium text-[#0f1d33]">Email Address</th>
                  <th className="px-6 py-4 font-medium text-[#0f1d33]">Role</th>
                  <th className="px-6 py-4 font-medium text-[#0f1d33]">Status</th>
                  <th className="px-6 py-4 font-medium text-[#0f1d33]">Date Added</th>
                  <th className="px-6 py-4 font-medium text-[#0f1d33]">Last Sign In</th>
                  {userRole === 'Super Admin' && (
                    <th className="px-6 py-4 font-medium text-[#0f1d33] text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-[#5a6a82]">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id} className="hover:bg-[#f3f5f8] transition-colors group">
                      <td className="px-6 py-4 text-[#5a6a82]">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-[#e8ecf2] flex items-center justify-center flex-shrink-0">
                            <Shield className="h-4 w-4 text-[#1e3a5f]" />
                          </div>
                          <div>
                            {user.name && <div className="font-medium text-[#0f1d33]">{user.name}</div>}
                            <div className={`${user.name ? 'text-xs text-[#5a6a82]' : 'font-medium text-[#1e3a5f]'}`}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 capitalize">
                          {user.role || 'admin'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.is_disabled ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#5a6a82]">
                        {(() => {
                          const d = new Date(user.created_at)
                          return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                        })()}
                      </td>
                      <td className="px-6 py-4 text-[#5a6a82]">
                        {user.last_sign_in_at ? (
                          (() => {
                            const d = new Date(user.last_sign_in_at)
                            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                          })()
                        ) : (
                          <span className="italic">Never</span>
                        )}
                      </td>
                      {userRole === 'Super Admin' && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleStatus(user.id, user.is_disabled || false)}
                              disabled={actionLoadingId === user.id}
                              title={user.is_disabled ? "Enable user" : "Disable user"}
                              className={`p-1.5 rounded transition-all disabled:opacity-50 ${
                                user.is_disabled 
                                  ? "text-emerald-600 hover:bg-emerald-50" 
                                  : "text-amber-600 hover:bg-amber-50"
                              }`}
                            >
                              {user.is_disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedUserToEdit(user)
                                setIsEditModalOpen(true)
                              }}
                              disabled={actionLoadingId === user.id}
                              title="Edit user"
                              className="p-1.5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-all disabled:opacity-50"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openPasswordModal(user.id)}
                              disabled={actionLoadingId === user.id}
                              title="Change password"
                              className="p-1.5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-all disabled:opacity-50"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(user.id)}
                              disabled={actionLoadingId === user.id}
                              title="Delete user"
                              className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                            >
                              {actionLoadingId === user.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center items-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#c4a55a]" />
            </div>
          ) : fetchError ? (
            <div className="p-8 text-center text-sm text-red-600">
              {fetchError}
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#e8ecf2]">
              {paginatedUsers.length === 0 ? (
                <div className="p-8 text-center text-[#5a6a82]">
                  No users found matching your search.
                </div>
              ) : (
                paginatedUsers.map((user, index) => (
                  <div key={`mobile-${user.id}`} className="p-4 flex flex-col gap-3 hover:bg-[#f3f5f8] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#e8ecf2] flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-[#1e3a5f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {user.name && <div className="font-semibold text-[#0f1d33] text-base truncate">{user.name}</div>}
                        <div className={`truncate ${user.name ? 'text-sm text-[#5a6a82]' : 'font-semibold text-[#1e3a5f] text-base'}`}>{user.email}</div>
                      </div>
                      <div>
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-200 capitalize">
                          {user.role || 'admin'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm ml-[3.25rem]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-[#5a6a82]">Status</span>
                        {user.is_disabled ? (
                          <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 border border-red-200 w-fit">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-200 w-fit">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-[#5a6a82]">Last Sign In</span>
                        <span className="text-[#0f1d33] font-medium">
                          {user.last_sign_in_at ? (
                            (() => {
                              const d = new Date(user.last_sign_in_at)
                              return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`
                            })()
                          ) : (
                            <span className="italic">Never</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {userRole === 'Super Admin' && (
                      <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#e8ecf2]">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.is_disabled || false)}
                          disabled={actionLoadingId === user.id}
                          title={user.is_disabled ? "Enable user" : "Disable user"}
                          className={`p-1.5 rounded transition-all disabled:opacity-50 ${
                            user.is_disabled 
                              ? "text-emerald-600 hover:bg-emerald-50" 
                              : "text-amber-600 hover:bg-amber-50"
                          }`}
                        >
                          {user.is_disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUserToEdit(user)
                            setIsEditModalOpen(true)
                          }}
                          disabled={actionLoadingId === user.id}
                          title="Edit user"
                          className="p-1.5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-all disabled:opacity-50"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openPasswordModal(user.id)}
                          disabled={actionLoadingId === user.id}
                          title="Change password"
                          className="p-1.5 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded transition-all disabled:opacity-50"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          disabled={actionLoadingId === user.id}
                          title="Delete user"
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                        >
                          {actionLoadingId === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && !fetchError && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e8ecf2] px-4 py-3 bg-white sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[#5a6a82]">
                  Showing <span className="font-medium text-[#0f1d33]">{startIndex + 1}</span> to <span className="font-medium text-[#0f1d33]">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of{' '}
                  <span className="font-medium text-[#0f1d33]">{filteredUsers.length}</span> results
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-black ring-1 ring-inset ring-[#e8ecf2] hover:bg-[#f3f5f8] focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-4 w-4 text-black" aria-hidden="true" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 transition-colors ${
                        page === currentPage
                          ? 'z-10 bg-[#1e3a5f] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1e3a5f]'
                          : 'text-[#0f1d33] ring-1 ring-inset ring-[#e8ecf2] hover:bg-[#f3f5f8]'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-black ring-1 ring-inset ring-[#e8ecf2] hover:bg-[#f3f5f8] focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors"
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-4 w-4 text-black" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
            
            {/* Mobile Pagination */}
            <div className="flex flex-1 justify-between sm:hidden items-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-[#e8ecf2] bg-white px-4 py-2 text-sm font-medium text-[#0f1d33] hover:bg-[#f3f5f8] disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <div className="flex items-center text-sm text-[#5a6a82]">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-md border border-[#e8ecf2] bg-white px-4 py-2 text-sm font-medium text-[#0f1d33] hover:bg-[#f3f5f8] disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8ecf2] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0f1d33] flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#c4a55a]" />
                Add User
              </h3>
              <button
                onClick={closeModal}
                className="rounded-lg p-1.5 text-[#5a6a82] hover:bg-[#f3f5f8] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleAddUser} className="space-y-4">
                {addError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                    {addError}
                  </div>
                )}
                
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#0f1d33] mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#0f1d33] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                    placeholder="admin@example.com"
                  />
                </div>

                <div className="relative">
                  <label htmlFor="role" className="block text-sm font-medium text-[#0f1d33] mb-1">
                    Role
                  </label>
                  <div className="relative">
                    <select
                      name="role"
                      id="role"
                      required
                      defaultValue={activeRoleFilter || 'Telecaller'}
                      className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] pl-3 pr-10 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f] appearance-none cursor-pointer"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5a6a82]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>



                <div className="mt-8 flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#5a6a82] hover:bg-[#f3f5f8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="inline-flex items-center justify-center rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f1d33] transition-colors disabled:opacity-50"
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create User'
                    )}
                  </button>
                </div>
                <div className="pb-16"></div> {/* Extra space to ensure dropdown opens downwards */}
              </form>
            </div>
          </div>
        </div>
      )}

      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8ecf2] px-6 py-4">
              <h3 className="text-lg font-semibold text-[#0f1d33] flex items-center gap-2">
                <Key className="w-5 h-5 text-[#c4a55a]" />
                Change Password
              </h3>
              <button
                onClick={closePasswordModal}
                className="rounded-lg p-1.5 text-[#5a6a82] hover:bg-[#f3f5f8] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleChangePassword} className="space-y-4">
                {passwordError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                    {passwordError}
                  </div>
                )}
                
                <p className="text-sm text-[#5a6a82] mb-4">
                  Enter a new password for this user. The old password is not required.
                </p>

                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-[#0f1d33] mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      id="new_password"
                      required
                      minLength={6}
                      className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 pr-10 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5a6a82] hover:text-[#0f1d33]"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSendResetEmail}
                    disabled={isSendingReset}
                    className="w-full inline-flex items-center justify-center rounded-lg border border-[#c4a55a] px-4 py-2 text-sm font-medium text-[#c4a55a] hover:bg-[#c4a55a]/10 transition-colors disabled:opacity-50"
                  >
                    {isSendingReset ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Password Reset Email Instead'
                    )}
                  </button>
                </div>

                <div className="mt-8 flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#5a6a82] hover:bg-[#f3f5f8] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="inline-flex items-center justify-center rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#0f1d33] transition-colors disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Password'
                    )}
                  </button>
                </div>
                <div className="pb-24"></div> {/* Extra space to ensure dropdown opens downwards */}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && selectedUserToEdit && (
        <div className="fixed inset-0 bg-[#0f1d33]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-visible shadow-xl border border-[#e8ecf2]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e8ecf2] bg-[#f8fafc] rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="bg-[#e8ecf2] p-2 rounded-lg">
                  <Pencil className="w-5 h-5 text-[#1e3a5f]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0f1d33]">Edit User</h2>
                  <p className="text-xs text-[#5a6a82]">Update {selectedUserToEdit.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#5a6a82] hover:bg-[#e8ecf2] hover:text-[#0f1d33] rounded-lg p-2 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditUser} className="p-6">
              {editError && (
                <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                  {editError}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">
                    Full Name
                  </label>
                  <input 
                    name="name" 
                    type="text" 
                    defaultValue={selectedUserToEdit.name}
                    required 
                    placeholder="E.g. John Doe"
                    className="w-full px-3 py-2 border border-[#e8ecf2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent text-sm bg-white text-[#0f1d33] transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">
                    Role
                  </label>
                  <div className="relative">
                    <select 
                      name="role" 
                      defaultValue={selectedUserToEdit.role || 'Admin'}
                      className="w-full rounded-lg border border-[#e8ecf2] bg-white pl-3 pr-10 py-2 text-sm text-[#0f1d33] outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent appearance-none cursor-pointer"
                    >
                      {roles.map(r => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5a6a82]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#5a6a82] bg-white border border-[#e8ecf2] hover:bg-[#f8fafc] hover:text-[#0f1d33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-[#1e3a5f] hover:bg-[#0f1d33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1d33]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-visible flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#e8ecf2] shrink-0">
              <h2 className="text-lg font-bold text-[#0f1d33]">Add New Role</h2>
              <button 
                onClick={() => setIsRoleModalOpen(false)}
                className="p-2 text-[#5a6a82] hover:bg-[#f3f5f8] rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddRole} className="p-5 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">
                    Role Name
                  </label>
                  <input 
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    type="text" 
                    required 
                    placeholder="E.g. Marketing Manager"
                    className="w-full px-3 py-2 border border-[#e8ecf2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent text-sm bg-white text-[#0f1d33]"
                  />
                </div>
              </div>

              {roleError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{roleError}</p>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#5a6a82] bg-white border border-[#e8ecf2] hover:bg-[#f8fafc] hover:text-[#0f1d33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingRole || !newRoleName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-[#1e3a5f] hover:bg-[#0f1d33] transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isAddingRole ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Role'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Role Modal */}
      {isDeleteRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0f1d33]/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-visible flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#e8ecf2] shrink-0">
              <h2 className="text-lg font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Role
              </h2>
              <button 
                onClick={() => setIsDeleteRoleModalOpen(false)}
                className="p-2 text-[#5a6a82] hover:bg-[#f3f5f8] rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleDeleteRoleSubmit} className="p-5 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">
                    Select Role to Delete
                  </label>
                  <div className="relative">
                    <select
                      value={roleToDelete}
                      onChange={(e) => {
                        setRoleToDelete(e.target.value)
                        setFallbackRole('')
                        setDeleteRoleError('')
                      }}
                      required
                      disabled={roles.filter(r => r.name !== 'Super Admin').length === 0}
                      className="w-full px-3 py-2 border border-[#e8ecf2] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent text-sm bg-white text-[#0f1d33] disabled:bg-gray-100 disabled:text-gray-500 appearance-none pr-10 cursor-pointer"
                    >
                      <option value="" disabled>
                        {roles.filter(r => r.name !== 'Super Admin').length === 0 
                          ? 'No custom roles available to delete' 
                          : 'Choose a role...'}
                      </option>
                      {roles
                        .filter(r => r.name !== 'Super Admin')
                        .map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))
                      }
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#5a6a82]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {roleToDelete && users.filter(u => u.role === roles.find(r => r.id === roleToDelete)?.name).length > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800 font-medium mb-3">
                      This role has {users.filter(u => u.role === roles.find(r => r.id === roleToDelete)?.name).length} users assigned to it. You must reassign them to another role.
                    </p>
                    <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">
                      Reassign Users To:
                    </label>
                    <div className="relative">
                      <select
                        value={fallbackRole}
                        onChange={(e) => {
                          setFallbackRole(e.target.value)
                          setDeleteRoleError('')
                        }}
                        required
                        className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm bg-white text-[#0f1d33] appearance-none pr-10 cursor-pointer"
                      >
                        <option value="" disabled>Choose fallback role...</option>
                        {roles
                          .filter(r => r.id !== roleToDelete)
                          .map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))
                        }
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#5a6a82]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {deleteRoleError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{deleteRoleError}</p>
                </div>
              )}

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteRoleModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-[#5a6a82] bg-white border border-[#e8ecf2] hover:bg-[#f8fafc] hover:text-[#0f1d33] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeletingRole || !roleToDelete || (users.filter(u => u.role === roles.find(r => r.id === roleToDelete)?.name).length > 0 && !fallbackRole)}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {isDeletingRole ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Role'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
