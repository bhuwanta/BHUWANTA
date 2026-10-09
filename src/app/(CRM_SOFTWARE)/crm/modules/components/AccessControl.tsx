'use client'

import { useState, useEffect } from 'react'
import { Shield, User, Save, Loader2, Info } from 'lucide-react'
import { getRolePermissions, updateRolePermissions, getUserPermissions, updateUserPermissions, AccessLevel, RolePermission, UserPermission } from '../actions'

const CRM_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'leads', label: 'Leads' },
  { id: 'users', label: 'Users' },
  { id: 'modules', label: 'Modules' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'areas', label: 'Areas' },
  { id: 'brochures', label: 'Brochures' },
  { id: 'media', label: 'Media' },
  { id: 'projects', label: 'Projects' },
  { id: 'reports', label: 'Reports' },
  { id: 'settings', label: 'Settings' }
]

export default function AccessControl({ roles, users }: { roles: any[], users: any[] }) {
  const [activeTab, setActiveTab] = useState<'roles' | 'users'>('roles')
  const [selectedRoleId, setSelectedRoleId] = useState<string>(roles[0]?.id || '')
  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '')
  
  // State for the matrix
  const [permissions, setPermissions] = useState<Record<string, AccessLevel>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null)

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
        } else if (activeTab === 'users' && selectedUserId) {
          const res = await getUserPermissions(selectedUserId)
          if (res.error) throw new Error(res.error)
          const permMap: Record<string, AccessLevel> = {}
          res.data.forEach(p => { permMap[p.module_name] = p.access_level })
          setPermissions(permMap)
        }
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [activeTab, selectedRoleId, selectedUserId])

  const handleAccessChange = (module: string, level: AccessLevel | 'default') => {
    setPermissions(prev => {
      const next = { ...prev }
      if (level === 'default') {
        delete next[module] // Remove override
      } else {
        next[module] = level as AccessLevel
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
      setTimeout(() => setMessage(null), 3000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const isSuperAdmin = activeTab === 'roles' && roles.find(r => r.id === selectedRoleId)?.name === 'Super Admin'

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
        <div className="mb-6 max-w-sm">
          {activeTab === 'roles' ? (
            <div>
              <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">Select Role</label>
              <select 
                value={selectedRoleId} 
                onChange={e => setSelectedRoleId(e.target.value)}
                className="w-full rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-sm text-[#0f1d33] outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-[#0f1d33] mb-1.5">Select User (Overrides Role)</label>
              <select 
                value={selectedUserId} 
                onChange={e => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-sm text-[#0f1d33] outline-none focus:ring-2 focus:ring-[#c4a55a] focus:border-transparent"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.email || u.name || 'Unknown'}</option>
                ))}
              </select>
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
                {activeTab === 'users' && <th className="px-6 py-4 font-semibold text-center text-[#5a6a82]">Inherit (Role Default)</th>}
                <th className="px-6 py-4 font-semibold text-center text-red-600">No Access</th>
                <th className="px-6 py-4 font-semibold text-center text-amber-600">View Only</th>
                <th className="px-6 py-4 font-semibold text-center text-emerald-600">Edit Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2]">
              {CRM_MODULES.map(mod => {
                const currentLevel = permissions[mod.id]
                
                return (
                  <tr key={mod.id} className="hover:bg-[#f8fafc]/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#0f1d33]">
                      {mod.label}
                    </td>
                    
                    {activeTab === 'users' && (
                      <td className="px-6 py-4 text-center">
                        <input 
                          type="radio" 
                          name={`${mod.id}-access`} 
                          checked={!currentLevel}
                          onChange={() => handleAccessChange(mod.id, 'default')}
                          className="w-4 h-4 text-[#c4a55a] focus:ring-[#c4a55a] border-gray-300"
                        />
                      </td>
                    )}

                    <td className="px-6 py-4 text-center bg-red-50/30">
                      <input 
                        type="radio" 
                        name={`${mod.id}-access`} 
                        checked={currentLevel === 'none' || (activeTab === 'roles' && !currentLevel)}
                        onChange={() => handleAccessChange(mod.id, 'none')}
                        disabled={isSuperAdmin}
                        className="w-4 h-4 text-red-600 focus:ring-red-600 border-red-300 disabled:opacity-50"
                      />
                    </td>
                    
                    <td className="px-6 py-4 text-center bg-amber-50/30">
                      <input 
                        type="radio" 
                        name={`${mod.id}-access`} 
                        checked={currentLevel === 'view'}
                        onChange={() => handleAccessChange(mod.id, 'view')}
                        disabled={isSuperAdmin}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-600 border-amber-300 disabled:opacity-50"
                      />
                    </td>
                    
                    <td className="px-6 py-4 text-center bg-emerald-50/30">
                      <input 
                        type="radio" 
                        name={`${mod.id}-access`} 
                        checked={currentLevel === 'edit' || isSuperAdmin}
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
            disabled={isSaving || isSuperAdmin}
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
