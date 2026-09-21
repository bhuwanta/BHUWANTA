'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Search, Globe, FilterX, Download, MessageCircle, Megaphone, Settings, ArrowUp, ArrowDown, ArrowUpDown, Check, RefreshCw } from 'lucide-react'


import { createClient } from '@/lib/supabase/client'
import { createLead, updateLead, deleteLead, deleteMultipleLeads, updateLeadStatus, getLeadActivities, getMetaForms, addMetaForm, deleteMetaForm, updateMetaFormName } from './actions'
import { useRouter } from 'next/navigation'

const LinkedinIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>
  </svg>
)

const FacebookIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
)

const InstagramIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
)

const YoutubeIcon = (props: any) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.11 1 12 1 12s0 3.89.46 5.58a1.9 1.9 0 0 0 1.32 1.35c1.7.47 8.22.47 8.22.47s6.52 0 8.22-.47a1.9 1.9 0 0 0 1.32-1.35c.46-1.69.46-5.58.46-5.58s0-3.89-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/>
  </svg>
)

const SourceBadge = ({ source }: { source: string }) => {
  if (!source) return <span className="inline-flex items-center rounded-full bg-[#f3f5f8] px-2.5 py-0.5 text-[10px] font-medium text-[#1e3a5f]">contact</span>;
  
  if (source.startsWith('Meta:')) {
    const parts = source.split(' | ');
    return (
      <div className="flex flex-col gap-1 items-start">
        {parts.map((part, index) => {
          if (part.startsWith('Meta:')) {
            const raw = part.replace('Meta:', '').trim();
            const match = raw.match(/^(.*?)\s+\((.*?)\)$/);
            
            if (match) {
              const name = match[1];
              const id = match[2];
              return (
                <div key={index} className="flex flex-col gap-1 items-start">
                  <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200 max-w-[180px] sm:max-w-xs truncate" title={name}>
                    <FacebookIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span className="truncate">Form: {name}</span>
                  </span>
                  <span className="inline-flex items-center rounded bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium text-slate-500 border border-slate-200 max-w-[180px] sm:max-w-xs truncate" title={id}>
                    <span className="truncate">ID: {id}</span>
                  </span>
                </div>
              );
            }

            return (
              <span key={index} className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200 max-w-[180px] sm:max-w-xs truncate" title={part}>
                <FacebookIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Form: {raw}</span>
              </span>
            );
          }
          if (part.startsWith('Campaign:')) {
            return (
              <span key={index} className="inline-flex items-center rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200 max-w-[180px] sm:max-w-xs truncate" title={part}>
                <Megaphone className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{part.replace('Campaign:', 'Cmp:').trim()}</span>
              </span>
            );
          }
          if (part.startsWith('Ad:')) {
            return (
              <span key={index} className="inline-flex items-center rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 border border-purple-200 max-w-[180px] sm:max-w-xs truncate" title={part}>
                <span className="truncate">{part.trim()}</span>
              </span>
            );
          }
          return (
            <span key={index} className="inline-flex items-center rounded bg-[#f3f5f8] px-1.5 py-0.5 text-[10px] font-medium text-[#1e3a5f] max-w-[180px] sm:max-w-xs truncate">
              {part.trim()}
            </span>
          );
        })}
      </div>
    );
  }
  
  return (
    <span className="inline-flex items-center rounded-full bg-[#f3f5f8] px-2.5 py-0.5 text-[10px] font-medium text-[#1e3a5f]">
      {source}
    </span>
  );
};

export default function LeadsClient({ initialLeads, userRole = 'Admin' }: { initialLeads: any[], userRole?: string }) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [dateFilterType, setDateFilterType] = useState<'single' | 'range'>('single')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // WhatsApp History State
  const [isWhatsappHistoryOpen, setIsWhatsappHistoryOpen] = useState(false)
  const [whatsappLead, setWhatsappLead] = useState<any | null>(null)
  const [whatsappActivities, setWhatsappActivities] = useState<any[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  
  // Bulk Selection State
  // Bulk Selection State
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  
  // Meta Settings State
  const [isMetaSettingsOpen, setIsMetaSettingsOpen] = useState(false)
  const [metaForms, setMetaForms] = useState<any[]>([])
  const [newFormId, setNewFormId] = useState('')
  const [newFormName, setNewFormName] = useState('')
  const [editingMetaFormId, setEditingMetaFormId] = useState<string | null>(null)
  const [editingMetaFormName, setEditingMetaFormName] = useState('')
  const [isMetaLoading, setIsMetaLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncCountdown, setSyncCountdown] = useState(15 * 60) // 15 minutes
  
  // Sort State
  type SortField = 'created_at' | 'name' | 'phone' | 'source_page' | 'status'
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Countdown Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncCountdown(prev => {
        if (prev <= 1) return 15 * 60;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to all changes in the leads table
    const channel = supabase.channel('leads_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads' }, (payload) => {
        setLeads((currentLeads) => {
          // Prevent duplicates if local state was updated optimistically
          if (currentLeads.some(l => l.id === payload.new.id)) return currentLeads
          return [payload.new, ...currentLeads]
        })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads((currentLeads) => currentLeads.map(lead => lead.id === payload.new.id ? payload.new : lead))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads' }, (payload) => {
        setLeads((currentLeads) => currentLeads.filter(lead => lead.id !== payload.old.id))
        setSelectedLeadIds((currentIds) => currentIds.filter(id => id !== payload.old.id))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const toggleSourceFilter = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 text-[#5a6a82] opacity-50" />
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 text-[#1e3a5f]" />
      : <ArrowDown className="w-3 h-3 ml-1 text-[#1e3a5f]" />
  }

  const openAddModal = () => {
    setEditingLead(null)
    setError('')
    setIsModalOpen(true)
  }

  const openEditModal = (lead: any) => {
    setEditingLead(lead)
    setError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingLead(null)
  }

  const openWhatsappHistory = async (lead: any) => {
    setWhatsappLead(lead)
    setIsWhatsappHistoryOpen(true)
    setIsLoadingActivities(true)
    const { data } = await getLeadActivities(lead.id)
    setWhatsappActivities(data || [])
    setIsLoadingActivities(false)
  }

  const openMetaSettings = async () => {
    setIsMetaSettingsOpen(true)
    setIsMetaLoading(true)
    const { data } = await getMetaForms()
    setMetaForms(data || [])
    setIsMetaLoading(false)
  }

  const handleAddMetaForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newFormId.trim()) return
    setIsMetaLoading(true)
    const res = await addMetaForm(newFormId, newFormName)
    if (res.error) {
      alert(res.error)
    } else {
      setNewFormId('')
      setNewFormName('')
      const { data } = await getMetaForms()
      setMetaForms(data || [])
    }
    setIsMetaLoading(false)
  }

  const handleDeleteMetaForm = async (id: string) => {
    if (!confirm('Remove this Form ID?')) return
    setIsMetaLoading(true)
    const res = await deleteMetaForm(id)
    if (res.error) {
      alert(res.error)
    } else {
      setMetaForms(metaForms.filter(f => f.id !== id))
    }
    setIsMetaLoading(false)
  }

  const handleUpdateMetaFormName = async (id: string) => {
    if (!editingMetaFormId) return
    setIsMetaLoading(true)
    const res = await updateMetaFormName(id, editingMetaFormName)
    if (res.error) {
      alert(res.error)
    } else {
      setMetaForms(metaForms.map(f => f.id === id ? { ...f, name: editingMetaFormName } : f))
      setEditingMetaFormId(null)
    }
    setIsMetaLoading(false)
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    setSyncCountdown(15 * 60)
    try {
      const res = await fetch('/api/cron/meta-sync')
      const data = await res.json()
      if (data.error) {
        alert('Sync error: ' + data.error)
      } else {
        let msg = `Sync complete! Processed ${data.processed || 0} leads from Meta (duplicates skipped).`
        if (data.errors && data.errors.length > 0) {
          msg += '\n\nHowever, some forms had errors:\n' + data.errors.join('\n')
        }
        alert(msg)
        router.refresh()
      }
    } catch (err) {
      alert('Failed to sync leads.')
    }
    setIsSyncing(false)
  }

  const closeWhatsappHistory = () => {
    setIsWhatsappHistoryOpen(false)
    setWhatsappLead(null)
    setWhatsappActivities([])
  }

  const toggleSelectAll = () => {
    if (selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0) {
      setSelectedLeadIds([])
    } else {
      setSelectedLeadIds(filteredLeads.map((l: any) => l.id))
    }
  }

  const toggleSelect = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter(leadId => leadId !== id))
    } else {
      setSelectedLeadIds([...selectedLeadIds, id])
    }
  }

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedLeadIds.length} leads?`)) return
    
    try {
      const result = await deleteMultipleLeads(selectedLeadIds)
      if (result.error) {
        alert(result.error)
      } else {
        setLeads(leads.filter(l => !selectedLeadIds.includes(l.id)))
        setSelectedLeadIds([])
        router.refresh()
      }
    } catch (err) {
      alert('Failed to delete leads.')
    }
  }

  const exportToCSV = () => {
    const leadsToExport = filteredLeads;
    if (!leadsToExport || leadsToExport.length === 0) {
      alert('No leads to export');
      return;
    }

    const headers = ['Date', 'Name', 'Email', 'Phone', 'Source', 'Project', 'Enquiry Type', 'Property Interest', 'Location', 'Status', 'Message'];
    const csvRows = [headers.join(',')];

    for (const lead of leadsToExport) {
      const values = [
        `"${new Date(lead.created_at).toLocaleDateString()}"`,
        `"${(lead.name || '').replace(/"/g, '""')}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.phone || '').replace(/"/g, '""')}"`,
        `"${(lead.source_page || 'contact').replace(/"/g, '""')}"`,
        `"${(lead.project || '').replace(/"/g, '""')}"`,
        `"${(lead.enquiry_type || '').replace(/"/g, '""')}"`,
        `"${(lead.property_interest || '').replace(/"/g, '""')}"`,
        `"${(lead.location || '').replace(/"/g, '""')}"`,
        `"${(lead.status || 'new').replace(/"/g, '""')}"`,
        `"${(lead.message || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ];
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    
    try {
      let result;
      if (editingLead) {
        result = await updateLead(editingLead.id, formData)
      } else {
        result = await createLead(formData)
      }

      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        if (result.data) {
          if (editingLead) {
            setLeads(leads.map(l => l.id === editingLead.id ? result.data[0] : l))
          } else {
            setLeads([result.data[0], ...leads])
          }
        }
        closeModal()
      }
    } catch (err) {
      setError('An unexpected error occurred.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return
    
    try {
      const result = await deleteLead(id)
      if (result.error) {
        alert(result.error)
      } else {
        setLeads(leads.filter(l => l.id !== id))
        // also remove from selected if present
        setSelectedLeadIds(selectedLeadIds.filter(leadId => leadId !== id))
        router.refresh()
      }
    } catch (err) {
      alert('Failed to delete lead.')
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const result = await updateLeadStatus(id, newStatus)
      if (result.error) {
        alert(result.error)
      } else {
        setLeads(leads.map(l => l.id === id ? { ...l, status: newStatus } : l))
        router.refresh()
      }
    } catch (err) {
      alert('Failed to update status.')
    }
  }

  const filteredLeads = useMemo(() => {
    let result = leads;
    
    if (selectedSources.length > 0) {
      result = result.filter(lead => {
        const source = lead.source_page?.toLowerCase() || '';
        return selectedSources.some(s => {
          if (s === 'meta') {
            return source.includes('meta') || source.includes('facebook') || source.includes('instagram');
          }
          return source.includes(s);
        });
      });
    }
    
    if (!searchQuery.trim() && !startDate && !endDate) return result;
    
    if (dateFilterType === 'single' && startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(startDate)
      end.setHours(23, 59, 59, 999)
      result = result.filter(lead => {
        const d = new Date(lead.created_at)
        return d >= start && d <= end
      })
    } else if (dateFilterType === 'range') {
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        result = result.filter(lead => new Date(lead.created_at) >= start)
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        result = result.filter(lead => new Date(lead.created_at) <= end)
      }
    }

    const lowerQuery = searchQuery.toLowerCase();
    if (lowerQuery) {
      result = result.filter(lead => 
        (lead.name && lead.name.toLowerCase().includes(lowerQuery)) ||
        (lead.email && lead.email.toLowerCase().includes(lowerQuery)) ||
        (lead.phone && lead.phone.toLowerCase().includes(lowerQuery)) ||
        (lead.project && lead.project.toLowerCase().includes(lowerQuery))
      );
    }
    
    result.sort((a, b) => {
      let aVal = a[sortField] || ''
      let bVal = b[sortField] || ''
      
      if (sortField === 'created_at') {
         aVal = new Date(a.created_at).getTime()
         bVal = new Date(b.created_at).getTime()
      } else {
         aVal = String(aVal).toLowerCase()
         bVal = String(bVal).toLowerCase()
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [leads, searchQuery, selectedSources, startDate, endDate, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Leads</h1>
          <p className="mt-2 text-sm text-[#5a6a82]">
            Manage and view your leads from all sources.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {selectedLeadIds.length > 0 && userRole !== 'Telecaller' && (
            <button
              onClick={handleBulkDelete}
              className="inline-flex items-center w-full sm:w-auto justify-center rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedLeadIds.length})
            </button>
          )}

          <button
            onClick={openAddModal}
            className="inline-flex items-center w-full sm:w-auto justify-center rounded-lg bg-gradient-to-r from-[#c4a55a] to-[#b3954c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-opacity"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lead
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-[#e8ecf2] shadow-sm">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-5 w-5 text-[#5a6a82]" />
          </div>
          <input
            type="text"
            placeholder="Search leads by name, email, phone, or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-lg border border-[#e8ecf2] bg-[#f9fafb] py-2.5 pl-11 pr-4 text-sm text-[#0f1d33] placeholder-[#5a6a82] outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-shadow"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-[#5a6a82] mr-2">Filter by Source:</span>
        
        <button
          onClick={() => toggleSourceFilter('meta')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedSources.includes('meta') ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2]'
          }`}
        >
          <FacebookIcon className="w-4 h-4" /> Meta
        </button>
        
        <button
          onClick={() => toggleSourceFilter('website')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedSources.includes('website') ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2]'
          }`}
        >
          <Globe className="w-4 h-4" /> Website
        </button>
        
        <button
          onClick={() => toggleSourceFilter('youtube')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedSources.includes('youtube') ? 'bg-red-50 border-red-200 text-red-600' : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2]'
          }`}
        >
          <YoutubeIcon className="w-4 h-4" /> YouTube
        </button>

        <button
          onClick={() => toggleSourceFilter('linkedin')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedSources.includes('linkedin') ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2]'
          }`}
        >
          <LinkedinIcon className="w-4 h-4" /> LinkedIn
        </button>
        <button
          onClick={() => toggleSourceFilter('whatsapp')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedSources.includes('whatsapp') ? 'bg-green-50 border-green-200 text-green-600' : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2]'
          }`}
        >
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </button>

        <button
          onClick={() => toggleSourceFilter('google ads')}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            selectedSources.includes('google ads') ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2]'
          }`}
        >
          <Megaphone className="w-4 h-4" /> Google Ads
        </button>


        <div className="w-full h-px bg-[#e8ecf2] my-1 sm:hidden lg:block lg:w-full" />
        
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          <div className="flex bg-[#f3f5f8] rounded-lg p-0.5 border border-[#e8ecf2]">
            <button
              onClick={() => {
                setDateFilterType('single')
                setEndDate('')
              }}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilterType === 'single'
                  ? 'bg-[#0f1d33] text-white shadow-sm'
                  : 'text-[#5a6a82] hover:text-[#0f1d33]'
              }`}
            >
              Single Date
            </button>
            <button
              onClick={() => setDateFilterType('range')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                dateFilterType === 'range'
                  ? 'bg-[#0f1d33] text-white shadow-sm'
                  : 'text-[#5a6a82] hover:text-[#0f1d33]'
              }`}
            >
              Date Range
            </button>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-1.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
          />
          {dateFilterType === 'range' && (
            <>
              <span className="text-[#5a6a82] text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-1.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
              />
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto mt-2 sm:mt-0">
          {(selectedSources.length > 0 || startDate || endDate) && (
            <button
              onClick={() => {
                setSelectedSources([])
                setStartDate('')
                setEndDate('')
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-[#5a6a82] hover:text-[#0f1d33] transition-colors"
            >
              <FilterX className="w-4 h-4" /> Clear Filters
            </button>
          )}
          {userRole !== 'Telecaller' && (
            <>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center gap-1.5 justify-center rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : `Sync Meta Leads (${formatCountdown(syncCountdown)})`}
              </button>
              <button
                onClick={openMetaSettings}
                className="inline-flex items-center gap-1.5 justify-center rounded-full bg-[#f3f5f8] border border-[#e8ecf2] px-4 py-1.5 text-sm font-semibold text-[#1e3a5f] hover:bg-[#e8ecf2] transition-colors"
              >
                <Settings className="h-4 w-4" />
                Meta Setup
              </button>
            </>
          )}
          <button
            onClick={exportToCSV}
            className="inline-flex items-center gap-1.5 justify-center rounded-full bg-[#0f1d33] px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1e3a5f] transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm flex flex-col overflow-hidden h-[65vh] md:h-[75vh]">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full text-sm text-left relative">
            <thead className="bg-[#f7f8fa] text-[#5a6a82] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-medium w-10">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center">Date <SortIcon field="created_at" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Name <SortIcon field="name" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('phone')}>
                  <div className="flex items-center">Contact <SortIcon field="phone" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('source_page')}>
                  <div className="flex items-center">Source <SortIcon field="source_page" /></div>
                </th>
                <th className="px-6 py-4 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status <SortIcon field="status" /></div>
                </th>
                {userRole !== 'Telecaller' && (
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2]">
              {filteredLeads && filteredLeads.length > 0 ? (
                filteredLeads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-[#f3f5f8] transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#1e3a5f]"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-[#0f1d33]">
                        {new Date(lead.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-[#5a6a82] mt-0.5">
                        {new Date(lead.created_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[#0f1d33]">{lead.name}</div>
                        {lead.bot_interactions_count > 1 && (
                          <span className="inline-flex items-center rounded bg-[#c4a55a]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#c4a55a] border border-[#c4a55a]/20" title={`Interacted with bot ${lead.bot_interactions_count} times`}>
                            {lead.bot_interactions_count}x Returns
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[#0f1d33]">{lead.phone || '-'}</div>
                      <div className="text-xs text-[#5a6a82]">{lead.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-start gap-1">
                        <SourceBadge source={lead.source_page} />
                        {lead.project && (
                          <span className="text-[10px] font-semibold text-[#0f1d33] bg-[#c4a55a]/10 px-2 py-0.5 rounded border border-[#c4a55a]/20">
                            Project: {lead.project}
                          </span>
                        )}
                        {lead.enquiry_type && (
                          <span className="text-xs text-[#5a6a82]">
                            {lead.enquiry_type}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize appearance-none cursor-pointer border border-transparent focus:border-[#e8ecf2] focus:ring-0 hover:opacity-80 transition-opacity
                          ${lead.status === 'new' ? 'bg-emerald-50 text-emerald-600' 
                          : lead.status === 'closed' || lead.status === 'rejected' ? 'bg-red-50 text-red-600'
                          : lead.status === 'contacted' ? 'bg-blue-50 text-blue-600'
                          : lead.status === 'uncontacted' ? 'bg-orange-50 text-orange-600'
                          : lead.status === 'qualified' ? 'bg-purple-50 text-purple-600'
                          : 'bg-[#f3f5f8] text-[#1e3a5f]'}`}
                      >
                        <option value="new">{lead.source_page?.toLowerCase().includes('whatsapp') ? 'Unverified contact' : 'New'}</option>
                        <option value="contacted">Contacted</option>
                        <option value="uncontacted">Uncontacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="rejected">Rejected</option>
                        <option value="closed">Closed</option>
                      </select>
                    </td>
                    {userRole !== 'Telecaller' && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          {lead.source_page?.toLowerCase().includes('whatsapp') && (
                            <button
                              onClick={() => openWhatsappHistory(lead)}
                              className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded-full"
                              title="WhatsApp History"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(lead)}
                            className="text-[#1e3a5f] hover:text-[#0f1d33]"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={userRole === 'Telecaller' ? 6 : 7} className="px-6 py-8 text-center text-[#5a6a82]">
                    No leads found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col divide-y divide-[#e8ecf2] overflow-y-auto">
          {filteredLeads && filteredLeads.length > 0 ? (
            filteredLeads.map((lead: any) => (
              <div key={`mobile-${lead.id}`} className="p-4 flex flex-col gap-3 hover:bg-[#f7f8fa] transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedLeadIds.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="mt-1 rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#1e3a5f]"
                    />
                    <div>
                      <div className="font-semibold text-[#0f1d33] text-base">{lead.name}</div>
                      <div className="text-sm text-[#5a6a82] mt-0.5">
                        {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(lead.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  {lead.bot_interactions_count > 1 && (
                    <span className="shrink-0 inline-flex items-center rounded bg-[#c4a55a]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#c4a55a] border border-[#c4a55a]/20">
                      {lead.bot_interactions_count}x
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm ml-7">
                  <div className="flex flex-col">
                    <span className="text-xs text-[#5a6a82] mb-0.5">Contact</span>
                    <span className="text-[#0f1d33] font-medium">{lead.phone || '-'}</span>
                    <span className="text-xs text-[#5a6a82] truncate block max-w-full overflow-hidden" title={lead.email}>{lead.email}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-[#5a6a82] mb-0.5">Source</span>
                    <div className="flex flex-wrap gap-1">
                      <SourceBadge source={lead.source_page} />
                      {lead.project && (
                        <span className="inline-flex items-center rounded bg-[#c4a55a]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0f1d33] border border-[#c4a55a]/20">
                          Project: {lead.project}
                        </span>
                      )}
                      {lead.enquiry_type && <span className="text-[10px] text-[#5a6a82]">{lead.enquiry_type}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between ml-7 mt-2 pt-3 border-t border-[#e8ecf2]">
                  <select
                    value={lead.status || 'new'}
                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize appearance-none cursor-pointer border border-transparent focus:border-[#e8ecf2] focus:ring-0 hover:opacity-80 transition-opacity
                      ${lead.status === 'new' ? 'bg-emerald-50 text-emerald-600' 
                      : lead.status === 'closed' || lead.status === 'rejected' ? 'bg-red-50 text-red-600'
                      : lead.status === 'contacted' ? 'bg-blue-50 text-blue-600'
                      : lead.status === 'uncontacted' ? 'bg-orange-50 text-orange-600'
                      : lead.status === 'qualified' ? 'bg-purple-50 text-purple-600'
                      : 'bg-[#f3f5f8] text-[#1e3a5f]'}`}
                  >
                    <option value="new">{lead.source_page?.toLowerCase().includes('whatsapp') ? 'Unverified contact' : 'New'}</option>
                    <option value="contacted">Contacted</option>
                    <option value="uncontacted">Uncontacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                  </select>

                  {userRole !== 'Telecaller' && (
                    <div className="flex items-center space-x-3">
                      {lead.source_page?.toLowerCase().includes('whatsapp') && (
                        <button
                          onClick={() => openWhatsappHistory(lead)}
                          className="text-green-600 hover:text-green-700 bg-green-50 p-1.5 rounded-full"
                          title="WhatsApp History"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => openEditModal(lead)} className="text-[#1e3a5f] hover:text-[#0f1d33] p-1.5 hover:bg-[#f3f5f8] rounded-full">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(lead.id)} className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-full">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-[#5a6a82]">No leads found.</div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0f1d33]">
                {editingLead ? 'Edit Lead' : 'Add Lead'}
              </h2>
              <button onClick={closeModal} className="text-[#5a6a82] hover:text-[#0f1d33]">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-[#0f1d33] mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    defaultValue={editingLead?.name}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#0f1d33] mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    required
                    defaultValue={editingLead?.email}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[#0f1d33] mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    id="phone"
                    defaultValue={editingLead?.phone}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-[#0f1d33] mb-1">Status</label>
                  <select
                    name="status"
                    id="status"
                    defaultValue={editingLead?.status || 'new'}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="uncontacted">Uncontacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="rejected">Rejected</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="source_page" className="block text-sm font-medium text-[#0f1d33] mb-1">Source</label>
                  <input
                    type="text"
                    name="source_page"
                    id="source_page"
                    defaultValue={editingLead?.source_page || 'contact'}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="location" className="block text-sm font-medium text-[#0f1d33] mb-1">Location</label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    defaultValue={editingLead?.location}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="project" className="block text-sm font-medium text-[#0f1d33] mb-1">Project</label>
                  <input
                    type="text"
                    name="project"
                    id="project"
                    defaultValue={editingLead?.project}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="enquiry_type" className="block text-sm font-medium text-[#0f1d33] mb-1">Enquiry Type</label>
                  <input
                    type="text"
                    name="enquiry_type"
                    id="enquiry_type"
                    defaultValue={editingLead?.enquiry_type}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="property_interest" className="block text-sm font-medium text-[#0f1d33] mb-1">Property Interest</label>
                  <input
                    type="text"
                    name="property_interest"
                    id="property_interest"
                    defaultValue={editingLead?.property_interest}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
                <div>
                  <label htmlFor="downloaded_item" className="block text-sm font-medium text-[#0f1d33] mb-1">Downloaded Item</label>
                  <input
                    type="text"
                    name="downloaded_item"
                    id="downloaded_item"
                    defaultValue={editingLead?.downloaded_item}
                    className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#0f1d33] mb-1">Message *</label>
                <textarea
                  name="message"
                  id="message"
                  required
                  rows={3}
                  defaultValue={editingLead?.message}
                  className="w-full rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-3 py-2.5 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                />
              </div>

              <div className="mt-6 flex justify-end space-x-3 border-t border-[#e8ecf2] pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#5a6a82] hover:bg-[#f3f5f8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#c4a55a] to-[#b3954c] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#c4a55a]/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : 'Save Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp History Modal */}
      {isWhatsappHistoryOpen && whatsappLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e8ecf2]">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2 rounded-full text-green-600">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0f1d33]">WhatsApp Activity</h2>
                  <p className="text-sm text-[#5a6a82]">{whatsappLead.name} ({whatsappLead.phone})</p>
                </div>
              </div>
              <button aria-label="Close WhatsApp activity" onClick={closeWhatsappHistory} className="text-[#5a6a82] hover:text-[#0f1d33]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-[#5a6a82] mb-4">A bot start or document request does not establish buying intent. Older entries may not contain the original message or acquisition source.</p>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {isLoadingActivities ? (
                <div className="text-center py-8 text-[#5a6a82]">Loading history...</div>
              ) : whatsappActivities.length === 0 ? (
                <div className="text-center py-8 text-[#5a6a82]">No recorded bot interactions yet.</div>
              ) : (
                <div className="relative border-l-2 border-[#e8ecf2] ml-3 pl-4 space-y-6">
                  {whatsappActivities.map((activity, idx) => (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-[#c4a55a] border-2 border-white"></div>
                      
                      <div className="bg-[#f3f5f8] rounded-lg p-3 inline-block min-w-[200px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#1e3a5f] text-sm">
                            {activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                        </div>
                        {activity.details && (
                          <p className="text-sm text-[#5a6a82] whitespace-pre-wrap break-words">{activity.details}</p>
                        )}
                        <span className="text-[10px] text-[#5a6a82] mt-2 block">
                          {new Date(activity.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Meta Settings Modal */}
      {isMetaSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1d33]/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#e8ecf2]">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                  <FacebookIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0f1d33]">Meta Lead Ads Sync</h2>
                  <p className="text-sm text-[#5a6a82]">Manage Form IDs to fetch leads automatically</p>
                </div>
              </div>
              <button onClick={() => setIsMetaSettingsOpen(false)} className="text-[#5a6a82] hover:text-[#0f1d33]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              <form onSubmit={handleAddMetaForm} className="bg-[#f7f8fa] p-4 rounded-lg border border-[#e8ecf2]">
                <h3 className="text-sm font-semibold text-[#0f1d33] mb-3">Add New Form ID</h3>
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      required
                      placeholder="Form ID (e.g. 10129381239)"
                      value={newFormId}
                      onChange={(e) => setNewFormId(e.target.value)}
                      className="w-full rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Form Name (Optional)"
                      value={newFormName}
                      onChange={(e) => setNewFormName(e.target.value)}
                      className="flex-1 rounded-lg border border-[#e8ecf2] bg-white px-3 py-2 text-sm text-[#0f1d33] outline-none focus:border-[#1e3a5f]"
                    />
                    <button
                      type="submit"
                      disabled={isMetaLoading}
                      className="inline-flex items-center justify-center rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f1d33] disabled:opacity-50"
                    >
                      {isMetaLoading ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </form>

              <div>
                <h3 className="text-sm font-semibold text-[#0f1d33] mb-3">Active Form IDs</h3>
                {isMetaLoading && metaForms.length === 0 ? (
                  <div className="text-sm text-[#5a6a82]">Loading forms...</div>
                ) : metaForms.length === 0 ? (
                  <div className="text-sm text-[#5a6a82] bg-[#f3f5f8] p-3 rounded-lg text-center">No active forms added yet.</div>
                ) : (
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {metaForms.map((form) => (
                        <li key={form.id} className="flex items-center justify-between bg-white border border-[#e8ecf2] p-3 rounded-lg shadow-sm">
                          {editingMetaFormId === form.id ? (
                            <div className="flex-1 flex gap-2 mr-3">
                              <input
                                type="text"
                                autoFocus
                                value={editingMetaFormName}
                                onChange={(e) => setEditingMetaFormName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateMetaFormName(form.id)
                                  if (e.key === 'Escape') setEditingMetaFormId(null)
                                }}
                                className="w-full rounded border border-[#e8ecf2] px-2 py-1 text-sm outline-none focus:border-[#1e3a5f]"
                              />
                              <button onClick={() => handleUpdateMetaFormName(form.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Save"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingMetaFormId(null)} className="p-1.5 text-[#5a6a82] hover:bg-[#f3f5f8] rounded" title="Cancel"><X className="w-4 h-4" /></button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-between mr-3">
                              <div>
                                <div className="text-sm font-medium text-[#0f1d33]">{form.form_id}</div>
                                {form.name && <div className="text-xs text-[#5a6a82] mt-0.5">{form.name}</div>}
                              </div>
                              <button
                                onClick={() => {
                                  setEditingMetaFormId(form.id)
                                  setEditingMetaFormName(form.name || '')
                                }}
                                className="text-[#5a6a82] hover:text-[#0f1d33] p-1.5 hover:bg-[#f3f5f8] rounded-md transition-colors"
                                title="Edit Name"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          
                          {editingMetaFormId !== form.id && (
                            <button
                              onClick={() => handleDeleteMetaForm(form.id)}
                              className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md transition-colors"
                              title="Remove Form"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 border-t border-[#e8ecf2] pt-4 text-xs text-[#5a6a82]">
              The system will automatically sync leads from these forms every 15 minutes.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
