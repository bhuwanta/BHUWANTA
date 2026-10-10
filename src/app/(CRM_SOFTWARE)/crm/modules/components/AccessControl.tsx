'use client'

import { useState, useEffect } from 'react'
import { Shield, User, Save, Loader2, Info, ChevronDown, Search, Check } from 'lucide-react'
import { getRolePermissions, updateRolePermissions, getUserPermissions, updateUserPermissions, AccessLevel, RolePermission, UserPermission } from '../actions'

const CRM_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'whatsapp', label: 'WhatsApp Leads' },
  { id: 'projects', label: 'Projects' },
  { id: 'reports', label: 'Reports' },
  { id: 'modules', label: 'Modules' },
  { id: 'users', label: 'Users' },
  { id: 'settings', label: 'Settings' }
]

export default function AccessControl({ roles, users }: { roles: any[], users: any[] }) {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles')
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '')
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '')
  
  // State for the matrix
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({})
  const [initialPermissions, setInitialPermissions] = useState<Record<string, AccessLevel>>({})
  const [inheritedPermissions, setInheritedPermissions] = useState<Record<string, AccessLevel>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)
  
  // State for user search dropdown
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.user-dropdown-container')) {
        setIsUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(userSearchQuery.toLowerCase())
  )
  const selectedUser = users.find(u => u.id === selectedUserId)

  // Fetch permissions when selection changes
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setMessage(null)
      try {
        if (activeTab === 'roles' && selectedRoleId) {
          const res = await getRolePermissions(selectedRoleId)
          if (res.error) throw new Error(res.error)
          const permMap: Record<string, AccessLevel> = {}
          res.data.forEach(p => { permMap[p.module_name] = p.access_level })
          setPermissions(permMap)
          setInitialPermissions(permMap)
        } else if (activeTab === 'users' && selectedUserId) {
          const res = await getUserPermissions(selectedUserId)
          if (res.error) throw new Error(res.error)
          const permMap: Record<string, AccessLevel> = {}
          res.data.forEach(p => { permMap[p.module_name] = p.access_level })
          setPermissions(permMap)
          setInitialPermissions(permMap)

          const user = users.find(u => u.id === selectedUserId)
          if (user && user.role) {
            const roleObj = roles.find(r => r.name === user.role)
            if (roleObj) {
              const roleRes = await getRolePermissions(roleObj.id)
              if (!roleRes.error && roleRes.data) {
                const rolePermMap: Record<string, AccessLevel> = {}
                roleRes.data.forEach(p => { rolePermMap[p.module_name] = p.access_level })
                setInheritedPermissions(rolePermMap)
              }
            }
          } else {
            setInheritedPermissions({})
          }
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [activeTab, selectedRoleId, selectedUserId])

  const handleAccessChange = (module: string, level: AccessLevel) => {
    setPermissions(prev => {
      const next = { ...prev }
      if (activeTab === 'users' && level === inheritedPermissions[module]) {
        // If they select the level that matches the role default, we can remove the override
        delete next[module]
      } else {
        next[module] = level
      }
      return next
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const payload = Object.entries(permissions).map(([module_name, access_level]) => ({
        module_name,
        access_level
      }))

      let res;
      if (activeTab === 'roles') {
        res = await updateRolePermissions(selectedRoleId, payload)
      } else {
        res = await updateUserPermissions(selectedUserId, payload)
      }

      if (res.error) throw new Error(res.error)
      setMessage({ type: 'success', text: 'Permissions saved successfully!' })
      setInitialPermissions(permissions)
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const isSuperAdmin = 
    (activeTab === 'roles' && roles.find(r => r.id === selectedRoleId)?.name === 'Super Admin') ||
    (activeTab === 'users' && users.find(u => u.id === selectedUserId)?.role === 'Super Admin')

  const isDirty = JSON.stringify(permissions) !== JSON.stringify(initialPermissions)

  return (
    <div className="bg-white rounded-2xl border border-[#e8ecf2] shadow-sm overflow-hidden">
      <div className="border-b border-[#e8ecf2] bg-[#f8fafc] p-6">
        <h2 className="text-xl font-bold text-[#0f1d33]">Access Control</h2>
        <p className="text-sm text-[#5a6a82] mt-1">Manage granular view and edit permissions for roles and specific users.</p>
      </div>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex space-x-1 p-1 bg-[#f3f5f8] rounded-xl w-fit mb-8">
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'roles' ? 'bg-white text-[#0f1d33] shadow-sm' : 'text-[#5a6a82] hover:text-[#0f1d33]'
            }`}
          >
            <Shield className="w-4 h-4 mr-2" />
            Role Permissions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'users' ? 'bg-white text-[#0f1d33] shadow-sm' : 'text-[#5a6a82] hover:text-[#0f1d33]'
            }`}
          >
            <User className="w-4 h-4 mr-2" />
            User Overrides
          </button>
        </div>

        {/* Selectors */}
        <div className="mb-6 max-w-lg">
          {activeTab === 'roles' ? (
            <div>
              <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">Select Role</label>
              <div className="relative">
                <select 
                  value={selectedRoleId} 
                  onChange={e => setSelectedRoleId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 pr-10 text-sm text-[#0f1d33] outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#5a6a82]">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">Select User (Overrides Role)</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 user-dropdown-container">
                  <div 
                    className="w-full flex items-center justify-between rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-sm text-[#0f1d33] cursor-pointer outline-none focus-within:ring-2 focus-within:ring-[#c4a55a] focus-within:border-transparent"
                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  >
                    <span className="truncate">
                      {selectedUser ? (
                        <>
                          <span className="font-medium">{selectedUser.name || 'Unknown'}</span>
                          <span className="text-[#5a6a82] ml-2">({selectedUser.email || 'No email'})</span>
                        </>
                      ) : (
                        'Select a user...'
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#5a6a82] shrink-0 ml-2" />
                  </div>
                  
                  {isUserDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-[#e8ecf2] bg-white shadow-lg overflow-hidden flex flex-col max-h-60">
                      <div className="p-2 border-b border-[#e8ecf2] bg-[#f8fafc] sticky top-0 z-10 flex items-center gap-2">
                        <Search className="h-4 w-4 text-[#5a6a82]" />
                        <input
                          type="text"
                          className="w-full bg-transparent text-sm outline-none text-[#0f1d33] placeholder:text-[#8c9bad]"
                          placeholder="Search name or email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      <div className="overflow-y-auto">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map(u => (
                            <div
                              key={u.id}
                              className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-[#f3f5f8] ${selectedUserId === u.id ? 'bg-[#f3f5f8]' : ''}`}
                              onClick={() => {
                                setSelectedUserId(u.id)
                                setIsUserDropdownOpen(false)
                                setUserSearchQuery('')
                              }}
                            >
                              <div className="flex flex-col truncate pr-2">
                                <span className="text-[#0f1d33] font-medium truncate">{u.name || 'Unknown'}</span>
                                <span className="text-xs text-[#5a6a82] truncate">{u.email || 'No email'}</span>
                              </div>
                              {selectedUserId === u.id && <Check className="h-4 w-4 text-[#c4a55a] shrink-0" />}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-4 text-center text-sm text-[#5a6a82]">
                            No users found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                {users.find(u => u.id === selectedUserId)?.role && (
                  <span className="text-[#c4a55a] font-medium text-[10px] uppercase tracking-wider bg-[#c4a55a]/10 px-3 py-2 rounded-lg border border-[#c4a55a]/20 shrink-0">
                    Role: {users.find(u => u.id === selectedUserId)?.role}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Matrix */}
        <div className="border border-[#e8ecf2] rounded-xl overflow-hidden relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
            </div>
          )}
          
          <table className="w-full text-left text-sm">
            <thead className="bg-[#f8fafc] border-b border-[#e8ecf2]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[#0f1d33]">Module / Page</th>
                <th className="px-6 py-4 font-semibold text-center text-red-600">No Access</th>
                <th className="px-6 py-4 font-semibold text-center text-amber-600">View Only</th>
                <th className="px-6 py-4 font-semibold text-center text-emerald-600">Edit Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2]">
              {CRM_MODULES.map(mod => {
                const userOverride = permissions[mod.id]
                const inherited = inheritedPermissions[mod.id]
                
                // Effective level is the user override, or the inherited role permission, or 'none'
                let effectiveLevel = 'none'
                if (activeTab === 'roles') {
                  effectiveLevel = userOverride || 'none'
                } else {
                  effectiveLevel = userOverride || inherited || 'none'
                }
                
                return (
                  <tr key={mod.id} className="hover:bg-[#f8fafc]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#0f1d33]">
                      <div className="flex items-center justify-between">
                        <span>{mod.label}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center bg-red-50/30">
                      <input 
                        type="radio" 
                        name={`${mod.id}-access`} 
                        checked={effectiveLevel === 'none' && !isSuperAdmin}
                        onChange={() => handleAccessChange(mod.id, 'none')}
                        disabled={isSuperAdmin}
                        className="w-4 h-4 text-red-600 focus:ring-red-600 border-red-300 disabled:opacity-50"
                      />
                    </td>
                    
                    <td className="px-6 py-4 text-center bg-amber-50/30">
                      <input 
                        type="radio" 
                        name={`${mod.id}-access`} 
                        checked={effectiveLevel === 'view' && !isSuperAdmin}
                        onChange={() => handleAccessChange(mod.id, 'view')}
                        disabled={isSuperAdmin}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-600 border-amber-300 disabled:opacity-50"
                      />
                    </td>
                    
                    <td className="px-6 py-4 text-center bg-emerald-50/30">
                      <input 
                        type="radio" 
                        name={`${mod.id}-access`} 
                        checked={effectiveLevel === 'edit' || isSuperAdmin}
                        onChange={() => handleAccessChange(mod.id, 'edit')}
                        disabled={isSuperAdmin}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-600 border-emerald-300 disabled:opacity-50"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          
          {isSuperAdmin && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[2px] flex items-center justify-center p-6 text-center z-20">
              <div className="bg-white border border-[#e8ecf2] shadow-lg rounded-xl p-6 max-w-sm">
                <Shield className="w-10 h-10 text-[#c4a55a] mx-auto mb-3" />
                <h3 className="font-bold text-[#0f1d33] mb-1">Super Admin Role</h3>
                <p className="text-sm text-[#5a6a82]">The Super Admin role is protected and automatically receives full Edit Access to all modules.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {message && (
              <div className={`flex items-center text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`}>
                {message.type === 'error' ? <Info className="w-4 h-4 mr-2" /> : null}
                {message.text}
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty || isSuperAdmin}
            className="inline-flex items-center justify-center rounded-lg bg-[#c4a55a] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#b09451] transition-colors disabled:opacity-50 shadow-sm shadow-[#c4a55a]/20"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Permissions
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}
