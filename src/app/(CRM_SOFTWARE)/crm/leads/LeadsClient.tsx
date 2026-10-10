'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Search, Globe, FilterX, Download, MessageCircle, Megaphone, Settings, ArrowUp, ArrowDown, ArrowUpDown, Check, RefreshCw } from 'lucide-react'


import { createClient } from '@/lib/supabase/client'
import { createLead, updateLead, deleteLead, deleteMultipleLeads, updateLeadStatus, getLeadActivities, getMetaForms, addMetaForm, deleteMetaForm, updateMetaFormName, getLeads } from './actions'
import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { toast } from 'sonner'

const extractIncomingMessage = (details: string) => {
  if (!details) return '(no text content)';
  
  const lines = details.split('\n');
  const msgLine = lines.find(l => l.startsWith('Message: '));
  
  if (msgLine) {
    let msg = msgLine.replace('Message: ', '').trim();
    if (msg.startsWith('"') && msg.endsWith('"')) {
      msg = msg.slice(1, -1);
    }
    return msg || '(no text content)';
  }
  return '(no text content)';
};

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

export default function LeadsClient({ 
  initialLeads, 
  totalCount = 0, 
  userRole = 'Admin',
  initialStatuses = []
}: { 
  initialLeads: any[]
  totalCount?: number
  userRole?: string
  initialStatuses?: any[]
}) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [statuses, setStatuses] = useState<any[]>(initialStatuses)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeadsCount, setTotalLeadsCount] = useState(totalCount || initialLeads.length)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const pageSize = 50
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (initialStatuses && initialStatuses.length > 0) {
      setStatuses(initialStatuses)
    }
  }, [initialStatuses])

  const getStatusBadgeStyle = (statusKey: string) => {
    const normalized = (statusKey || 'new').toLowerCase().trim()
    const found = statuses.find(s => s.key.toLowerCase() === normalized)
    if (found) {
      return `${found.color_bg} ${found.color_text} ${found.color_border || 'border-transparent'}`
    }
    if (normalized === 'new') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (normalized === 'contacted') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (normalized === 'uncontacted') return 'bg-orange-50 text-orange-700 border-orange-200'
    if (normalized === 'qualified') return 'bg-purple-50 text-purple-700 border-purple-200'
    if (normalized === 'site_visit_scheduled') return 'bg-indigo-50 text-indigo-700 border-indigo-200'
    if (normalized === 'site_visit_done') return 'bg-cyan-50 text-cyan-700 border-cyan-200'
    if (normalized === 'negotiation') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (normalized === 'booked') return 'bg-teal-50 text-teal-700 border-teal-200'
    if (normalized === 'rejected') return 'bg-red-50 text-red-700 border-red-200'
    if (normalized === 'closed') return 'bg-slate-100 text-slate-700 border-slate-200'
    return 'bg-[#f3f5f8] text-[#1e3a5f]'
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(totalLeadsCount / pageSize)) return;
    setCurrentPage(newPage);
  };
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [dateFilterType, setDateFilterType] = useState<'single' | 'range'>('single')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  // WhatsApp History State
  const [isWhatsappHistoryOpen, setIsWhatsappHistoryOpen] = useState(false)
  const [whatsappLead, setWhatsappLead] = useState<any | null>(null)
  const [whatsappActivities, setWhatsappActivities] = useState<any[]>([])
  const [isLoadingActivities, setIsLoadingActivities] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isWhatsappHistoryOpen && whatsappLead) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isWhatsappHistoryOpen, whatsappLead])
  
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
      const targetLead = leads.find(l => l.id === id)
      const rawPhone = targetLead?.phone?.trim()
      const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : ''

      // Optimistically update all leads matching this phone in local state
      setLeads(prevLeads => prevLeads.map(l => {
        if (l.id === id) return { ...l, status: newStatus }
        if (cleanPhone && cleanPhone.length >= 7 && l.phone) {
          const lClean = l.phone.replace(/\D/g, '')
          if (lClean.slice(-10) === cleanPhone.slice(-10)) {
            return { ...l, status: newStatus }
          }
        }
        return l
      }))

      const result = await updateLeadStatus(id, newStatus)
      if (result.error) {
        toast.error('Failed to update status', { description: result.error })
        router.refresh()
      } else {
        const statusObj = statuses.find(s => s.key === newStatus)
        const statusDisplayName = statusObj?.name || newStatus

        if (result.syncedCount && result.syncedCount > 1) {
          toast.success(`Updated to "${statusDisplayName}"`, {
            description: `Synced across ${result.syncedCount} inquiries for ${result.name || 'lead'} (${result.phone || ''}).`
          })
        } else {
          toast.success(`Lead status updated to "${statusDisplayName}"`)
        }
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Failed to update status', { description: err?.message || 'Please try again.' })
    }
  }

  // Debounce search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch leads on filter/page change
  useEffect(() => {
    const fetchFilteredLeads = async () => {
      setIsPageLoading(true);
      try {
        let sd = startDate;
        let ed = endDate;
        if (dateFilterType === 'single' && startDate) {
          ed = startDate; // getLeads will set this to 23:59:59
        }
        
        const filters = {
          searchQuery: debouncedSearchQuery,
          sources: selectedSources,
          status: selectedStatus,
          startDate: sd,
          endDate: ed,
          sortField,
          sortOrder
        };
        const res = await getLeads(currentPage, pageSize, filters);
        setLeads(res.data);
        setTotalLeadsCount(res.count);
        setSelectedLeadIds([]);
      } catch (err) {
        console.error('Error fetching filtered leads:', err);
      } finally {
        setIsPageLoading(false);
      }
    };

    fetchFilteredLeads();
  }, [currentPage, debouncedSearchQuery, selectedSources, selectedStatus, startDate, endDate, dateFilterType, sortField, sortOrder]);

  // Reset to page 1 when filters change (but not when page changes)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, selectedSources, selectedStatus, startDate, endDate, dateFilterType, sortField, sortOrder]);

  const filteredLeads = leads; // We now use the server-filtered leads directly


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
          {selectedLeadIds.length > 0 && userRole === 'Super Admin' && (
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

      <div className="flex flex-col gap-3.5 bg-white p-4 rounded-xl border border-[#e8ecf2] shadow-sm">
        {/* Row 1: Search Bar & Actions */}
        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-[#5a6a82]" />
            </div>
            <input
              type="text"
              placeholder="Search leads by name, email, phone, or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-lg border border-[#e8ecf2] bg-[#f9fafb] py-2 pl-10 pr-4 text-sm text-[#0f1d33] placeholder-[#5a6a82] outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] transition-shadow"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
            {(selectedStatus !== 'all' || selectedSources.length > 0 || startDate || endDate || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedStatus('all')
                  setSelectedSources([])
                  setStartDate('')
                  setEndDate('')
                  setSearchQuery('')
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                title="Reset all active filters"
              >
                <FilterX className="w-3.5 h-3.5" /> Clear All Filters
              </button>
            )}

            {userRole === 'Super Admin' && (
              <>
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 justify-center rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : `Sync Meta (${formatCountdown(syncCountdown)})`}
                </button>
                <button
                  onClick={openMetaSettings}
                  className="inline-flex items-center gap-1.5 justify-center rounded-lg bg-[#f3f5f8] border border-[#e8ecf2] px-3.5 py-1.5 text-xs font-semibold text-[#1e3a5f] hover:bg-[#e8ecf2] transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Meta Setup
                </button>
              </>
            )}

            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-1.5 justify-center rounded-lg bg-[#0f1d33] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#1e3a5f] transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Row 2: Source & Date Filters (Separate Line Like Before) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#f0f3f7]">
          {/* Source Filter Group */}
          <div className="flex items-center gap-2 min-w-0 max-w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82] shrink-0 whitespace-nowrap select-none">
              Filter by Source:
            </span>

            <div 
              className="overflow-x-auto pb-1 pt-0.5 min-w-0"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: '#94a3b8 #f1f5f9'
              }}
            >
              <div className="flex items-center gap-1.5 min-w-max py-0.5">
                <button
                  onClick={() => toggleSourceFilter('meta')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border shrink-0 ${
                    selectedSources.includes('meta')
                      ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold ring-1 ring-blue-300'
                      : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2] hover:text-[#0f1d33]'
                  }`}
                >
                  <FacebookIcon className="w-3.5 h-3.5" /> Meta
                </button>

                <button
                  onClick={() => toggleSourceFilter('website')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border shrink-0 ${
                    selectedSources.includes('website')
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold ring-1 ring-emerald-300'
                      : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2] hover:text-[#0f1d33]'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Website
                </button>

                <button
                  onClick={() => toggleSourceFilter('youtube')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border shrink-0 ${
                    selectedSources.includes('youtube')
                      ? 'bg-red-50 border-red-200 text-red-700 font-semibold ring-1 ring-red-300'
                      : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2] hover:text-[#0f1d33]'
                  }`}
                >
                  <YoutubeIcon className="w-3.5 h-3.5" /> YouTube
                </button>

                <button
                  onClick={() => toggleSourceFilter('whatsapp')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border shrink-0 ${
                    selectedSources.includes('whatsapp')
                      ? 'bg-green-50 border-green-200 text-green-700 font-semibold ring-1 ring-green-300'
                      : 'bg-[#f3f5f8] border-transparent text-[#5a6a82] hover:bg-[#e8ecf2] hover:text-[#0f1d33]'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </button>
              </div>
            </div>
          </div>

          {/* Date Filter Group */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82] shrink-0 whitespace-nowrap select-none mr-0.5">
              Date:
            </span>

            <div className="flex bg-[#f3f5f8] rounded-lg p-0.5 border border-[#e8ecf2] shrink-0">
              <button
                onClick={() => {
                  setDateFilterType('single')
                  setEndDate('')
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dateFilterType === 'single'
                    ? 'bg-[#0f1d33] text-white shadow-xs'
                    : 'text-[#5a6a82] hover:text-[#0f1d33]'
                }`}
              >
                Single Date
              </button>
              <button
                onClick={() => setDateFilterType('range')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dateFilterType === 'range'
                    ? 'bg-[#0f1d33] text-white shadow-xs'
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
              className="rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-2.5 py-1 text-xs text-[#0f1d33] outline-none focus:border-[#1e3a5f] shrink-0"
            />

            {dateFilterType === 'range' && (
              <>
                <span className="text-[#5a6a82] text-xs shrink-0">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-lg border border-[#e8ecf2] bg-[#f3f5f8] px-2.5 py-1 text-xs text-[#0f1d33] outline-none focus:border-[#1e3a5f] shrink-0"
                />
              </>
            )}
          </div>
        </div>

        {/* Row 3: Filters Section (Horizontally Scrollable Status Filters) */}
        <div className="flex items-center gap-3 pt-2 border-t border-[#f0f3f7] min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5a6a82] shrink-0 whitespace-nowrap select-none">
            Filter by Status:
          </span>

          <div 
            className="overflow-x-auto pb-1.5 pt-0.5 flex-1 min-w-0"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#94a3b8 #f1f5f9'
            }}
          >
            <div className="flex items-center gap-2 min-w-max py-0.5">
              {/* All Statuses Button */}
              <button
                onClick={() => setSelectedStatus('all')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border shrink-0 ${
                  selectedStatus === 'all'
                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f] shadow-xs font-semibold'
                    : 'bg-[#f3f5f8] text-[#5a6a82] border-transparent hover:bg-[#e8ecf2] hover:text-[#0f1d33]'
                }`}
              >
                All Statuses
              </button>

              {/* Dynamic Status Pills from Database */}
              {statuses.map((st: any) => {
                const isSelected = selectedStatus.toLowerCase() === st.key.toLowerCase()
                return (
                  <button
                    key={st.id || st.key}
                    onClick={() => setSelectedStatus(isSelected ? 'all' : st.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border shrink-0 ${
                      isSelected
                        ? `${st.color_bg || 'bg-blue-50'} ${st.color_text || 'text-blue-700'} ${st.color_border || 'border-blue-300'} ring-2 ring-current/25 font-semibold shadow-xs`
                        : 'bg-[#f3f5f8] text-[#5a6a82] border-transparent hover:bg-[#e8ecf2] hover:text-[#0f1d33]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current' : 'bg-gray-400'}`} />
                    {st.name}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm flex flex-col overflow-hidden h-[65vh] md:h-[75vh]">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-auto">
          <table className="w-full text-xs text-left relative">
            <thead className="bg-[#f7f8fa] text-[#5a6a82] sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 font-medium w-10">
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && filteredLeads.every(l => selectedLeadIds.includes(l.id))}
                    onChange={toggleSelectAll}
                    className="rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#1e3a5f]"
                  />
                </th>
                <th className="px-3 py-2 font-medium w-16 text-[#1e3a5f]">Sr. No</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors whitespace-nowrap" onClick={() => handleSort('created_at')}>
                  <div className="flex items-center">Date <SortIcon field="created_at" /></div>
                </th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors whitespace-nowrap" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Name <SortIcon field="name" /></div>
                </th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors whitespace-nowrap" onClick={() => handleSort('phone')}>
                  <div className="flex items-center">Contact <SortIcon field="phone" /></div>
                </th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors whitespace-nowrap" onClick={() => handleSort('source_page')}>
                  <div className="flex items-center">Source <SortIcon field="source_page" /></div>
                </th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[#e8ecf2] transition-colors whitespace-nowrap" onClick={() => handleSort('status')}>
                  <div className="flex items-center">Status <SortIcon field="status" /></div>
                </th>
                {userRole === 'Super Admin' && (
                  <th className="px-3 py-2 font-medium text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8ecf2]">
              {filteredLeads && filteredLeads.length > 0 ? (
                filteredLeads.map((lead: any) => (
                  <tr key={lead.id} className="hover:bg-[#f3f5f8] transition-colors">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded border-[#e8ecf2] text-[#1e3a5f] focus:ring-[#1e3a5f]"
                      />
                    </td>
                    <td className="px-3 py-2 text-[#5a6a82] text-sm">
                      {(currentPage - 1) * pageSize + filteredLeads.indexOf(lead) + 1}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
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
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-[#0f1d33]">{lead.name}</div>
                        {lead.bot_interactions_count > 1 && (
                          <span className="inline-flex items-center rounded bg-[#c4a55a]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#c4a55a] border border-[#c4a55a]/20" title={`Interacted with bot ${lead.bot_interactions_count} times`}>
                            {lead.bot_interactions_count}x Returns
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[#0f1d33] whitespace-nowrap">{lead.phone || '-'}</div>
                      <div className="text-xs text-[#5a6a82] break-all max-w-[150px]">{lead.email}</div>
                    </td>
                    <td className="px-3 py-2">
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
                    <td className="px-3 py-2">
                      <select
                        value={lead.status || 'new'}
                        onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize appearance-none cursor-pointer border focus:ring-0 hover:opacity-80 transition-opacity ${getStatusBadgeStyle(lead.status)}`}
                      >
                        {statuses.length > 0 ? (
                          statuses.map(s => (
                            <option key={s.id || s.key} value={s.key} className="bg-white text-[#0f1d33]">
                              {s.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="new" className="bg-white text-[#0f1d33]">New</option>
                            <option value="contacted" className="bg-white text-[#0f1d33]">Contacted</option>
                            <option value="uncontacted" className="bg-white text-[#0f1d33]">Uncontacted</option>
                            <option value="qualified" className="bg-white text-[#0f1d33]">Qualified</option>
                            <option value="rejected" className="bg-white text-[#0f1d33]">Rejected</option>
                            <option value="closed" className="bg-white text-[#0f1d33]">Closed</option>
                          </>
                        )}
                      </select>
                    </td>
                    {userRole === 'Super Admin' && (
                      <td className="px-3 py-2 text-right">
                        <div className="flex items-center justify-end space-x-3">
                          {lead.phone && (
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
                  <td colSpan={userRole !== 'Super Admin' ? 6 : 7} className="px-6 py-8 text-center text-[#5a6a82]">
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
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize appearance-none cursor-pointer border focus:ring-0 hover:opacity-80 transition-opacity ${getStatusBadgeStyle(lead.status)}`}
                  >
                    {statuses.length > 0 ? (
                      statuses.map(s => (
                        <option key={s.id || s.key} value={s.key} className="bg-white text-[#0f1d33]">
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="new" className="bg-white text-[#0f1d33]">New</option>
                        <option value="contacted" className="bg-white text-[#0f1d33]">Contacted</option>
                        <option value="uncontacted" className="bg-white text-[#0f1d33]">Uncontacted</option>
                        <option value="qualified" className="bg-white text-[#0f1d33]">Qualified</option>
                        <option value="rejected" className="bg-white text-[#0f1d33]">Rejected</option>
                        <option value="closed" className="bg-white text-[#0f1d33]">Closed</option>
                      </>
                    )}
                  </select>

                  {userRole === 'Super Admin' && (
                    <div className="flex items-center space-x-3">
                      {lead.phone && (
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

        {/* Pagination UI */}
        {totalLeadsCount > pageSize && (
          <div className="flex items-center justify-between border-t border-[#e8ecf2] bg-white px-4 py-3 sm:px-6 mt-auto">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || isPageLoading}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage * pageSize >= totalLeadsCount || isPageLoading}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, totalLeadsCount)}</span> of{' '}
                  <span className="font-medium">{totalLeadsCount}</span> results
                  {isPageLoading && <span className="ml-2 text-[#c4a55a]">Loading...</span>}
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isPageLoading}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage * pageSize >= totalLeadsCount || isPageLoading}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50 focus:z-20 focus:outline-offset-0"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
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
                    {statuses.length > 0 ? (
                      statuses.map(s => (
                        <option key={s.id || s.key} value={s.key}>
                          {s.name}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="uncontacted">Uncontacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="rejected">Rejected</option>
                        <option value="closed">Closed</option>
                      </>
                    )}
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

            <p className="text-sm text-[#5a6a82] mb-4">Chat history and bot interactions for this lead.</p>
            <div className="flex-1 overflow-y-auto p-4 bg-[#efeae2] flex flex-col relative rounded-lg border border-[#e8ecf2]">
              <div className="relative z-10 flex flex-col gap-3 pb-4">
              {isLoadingActivities ? (
                <div className="text-center py-8 text-[#5a6a82]">Loading history...</div>
              ) : whatsappActivities.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-[#5a6a82]">
                  <MessageCircle className="h-10 w-10 text-[#5a6a82]/30 mb-3" />
                  <p>No messages recorded yet.</p>
                </div>
              ) : (
                whatsappActivities.map((activity, idx) => {
                  const type = activity.activity_type.toLowerCase();
                  const time = new Date(activity.created_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
                  
                  if (type.includes('incoming whatsapp')) {
                    const msg = extractIncomingMessage(activity.details);
                    return (
                      <div key={idx} className="flex flex-col items-end self-end max-w-[85%] mt-1">
                        <div className="bg-[#d9fdd3] text-[#111b21] px-3 pt-2 pb-1.5 rounded-lg rounded-tr-none shadow-sm relative text-sm border border-[#c3e8bd]">
                           <span className="font-bold text-[#025c4c] text-[11px] leading-tight block mb-0.5">{whatsappLead.name || 'User'}</span>
                           <div className="whitespace-pre-wrap leading-snug">{msg}</div>
                           <div className="text-[10px] text-[#667781] text-right mt-1 -mb-0.5 ml-4 float-right">{time}</div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (type.includes('outgoing whatsapp')) {
                    return (
                      <div key={idx} className="flex flex-col items-start self-start max-w-[85%] mt-1">
                        <div className="bg-white text-[#111b21] px-3 pt-2 pb-1.5 rounded-lg rounded-tl-none shadow-sm relative text-sm border border-[#e8ecf2]">
                           <span className="font-bold text-[#c4a55a] text-[11px] leading-tight block mb-0.5">Bhuwanta Bot</span>
                           <div className="whitespace-pre-wrap leading-snug">{activity.details}</div>
                           <div className="text-[10px] text-[#667781] text-right mt-1 -mb-0.5 ml-4 float-right">{time}</div>
                        </div>
                      </div>
                    );
                  }
                  
                  // System Chip
                  let chipText = activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                  if (type === 'bot started') chipText = 'Bot Started Conversation';
                  else if (activity.details && !activity.details.includes('Provider timestamp')) {
                    chipText = `${chipText}: ${activity.details}`;
                  }
                  
                  return (
                    <div key={idx} className="flex justify-center my-2">
                      <div className="bg-[#f3f5f8] text-[#5a6a82] px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm border border-[#e8ecf2]">
                        {chipText} • {time}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
              </div>
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
