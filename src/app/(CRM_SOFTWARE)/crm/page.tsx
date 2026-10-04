'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  PhoneOff, 
  Phone, 
  XCircle, 
  Database, 
  UserPlus, 
  Star, 
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Mail,
  X
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [totalLeads, setTotalLeads] = useState<number | null>(null)
  const [todaysLeads, setTodaysLeads] = useState<number | null>(null)
  const [newLeads, setNewLeads] = useState<number | null>(null)
  const [uncontacted, setUncontacted] = useState<number | null>(null)
  const [contacted, setContacted] = useState<number | null>(null)
  const [qualified, setQualified] = useState<number | null>(null)
  const [rejected, setRejected] = useState<number | null>(null)
  const [closed, setClosed] = useState<number | null>(null)
  
  const [selectedFilter, setSelectedFilter] = useState<{ id: string, title: string } | null>(null)
  const [tableLeads, setTableLeads] = useState<any[]>([])
  const [tableCount, setTableCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const pageSize = 50
  
  useEffect(() => {
    async function fetchLeads() {
      const supabase = createClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [
        totalRes,
        todaysRes,
        newRes,
        uncontactedRes,
        contactedRes,
        qualifiedRes,
        rejectedRes,
        closedRes
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'uncontacted'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'contacted'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'qualified'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'closed')
      ]);
        
      if (!totalRes.error) setTotalLeads(totalRes.count || 0);
      if (!todaysRes.error) setTodaysLeads(todaysRes.count || 0);
      if (!newRes.error) setNewLeads(newRes.count || 0);
      if (!uncontactedRes.error) setUncontacted(uncontactedRes.count || 0);
      if (!contactedRes.error) setContacted(contactedRes.count || 0);
      if (!qualifiedRes.error) setQualified(qualifiedRes.count || 0);
      if (!rejectedRes.error) setRejected(rejectedRes.count || 0);
      if (!closedRes.error) setClosed(closedRes.count || 0);
    }
    fetchLeads();
  }, [])

  useEffect(() => {
    if (!selectedFilter) return;
    const filterId = selectedFilter.id;

    async function fetchFilteredLeads() {
      setIsTableLoading(true);
      const supabase = createClient();
      let query = supabase.from('leads').select('*', { count: 'exact' });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filterId === 'todays') {
        query = query.gte('created_at', today.toISOString());
      } else if (filterId === 'total') {
        // no filter
      } else {
        query = query.eq('status', filterId);
      }

      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (!error) {
        setTableLeads(data || []);
        setTableCount(count || 0);
      }
      setIsTableLoading(false);
    }
    fetchFilteredLeads();
  }, [selectedFilter, currentPage]);

  const handleCardClick = (id: string, title: string) => {
    if (selectedFilter?.id === id) {
      setSelectedFilter(null);
    } else {
      setSelectedFilter({ id, title });
      setCurrentPage(1);
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= Math.ceil(tableCount / pageSize)) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Dashboard Insights</h1>
        <p className="mt-2 text-sm text-[#5a6a82]">
          Overview of your CRM performance and daily activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard 
          title="Total Leads" 
          value={totalLeads !== null ? totalLeads.toString() : '...'} 
          description="All time leads"
          icon={<Database className="h-4 w-4 text-[#5a6a82]" />}
          onClick={() => handleCardClick('total', 'Total Leads')}
          isSelected={selectedFilter?.id === 'total'}
        />
        <DashboardCard 
          title="Today's Leads" 
          value={todaysLeads !== null ? todaysLeads.toString() : '...'} 
          description="Leads received today"
          icon={<Users className="h-4 w-4 text-[#5a6a82]" />} 
          onClick={() => handleCardClick('todays', "Today's Leads")}
          isSelected={selectedFilter?.id === 'todays'}
        />
        <DashboardCard 
          title="New Leads" 
          value={newLeads !== null ? newLeads.toString() : '...'} 
          description="Fresh enquiries"
          icon={<UserPlus className="h-4 w-4 text-emerald-500" />} 
          onClick={() => handleCardClick('new', 'New Leads')}
          isSelected={selectedFilter?.id === 'new'}
        />
        <DashboardCard 
          title="Uncontacted" 
          value={uncontacted !== null ? uncontacted.toString() : '...'} 
          description="Needs attention"
          icon={<PhoneOff className="h-4 w-4 text-orange-500" />} 
          onClick={() => handleCardClick('uncontacted', 'Uncontacted Leads')}
          isSelected={selectedFilter?.id === 'uncontacted'}
        />
        <DashboardCard 
          title="Contacted" 
          value={contacted !== null ? contacted.toString() : '...'} 
          description="Currently engaged"
          icon={<Phone className="h-4 w-4 text-blue-500" />} 
          onClick={() => handleCardClick('contacted', 'Contacted Leads')}
          isSelected={selectedFilter?.id === 'contacted'}
        />
        <DashboardCard 
          title="Qualified" 
          value={qualified !== null ? qualified.toString() : '...'} 
          description="High intent leads"
          icon={<Star className="h-4 w-4 text-purple-500" />} 
          onClick={() => handleCardClick('qualified', 'Qualified Leads')}
          isSelected={selectedFilter?.id === 'qualified'}
        />
        <DashboardCard 
          title="Closed" 
          value={closed !== null ? closed.toString() : '...'} 
          description="Successful deals"
          icon={<Briefcase className="h-4 w-4 text-emerald-600" />} 
          onClick={() => handleCardClick('closed', 'Closed Leads')}
          isSelected={selectedFilter?.id === 'closed'}
        />
        <DashboardCard 
          title="Rejected" 
          value={rejected !== null ? rejected.toString() : '...'} 
          description="Lost leads"
          icon={<XCircle className="h-4 w-4 text-red-500" />} 
          onClick={() => handleCardClick('rejected', 'Rejected Leads')}
          isSelected={selectedFilter?.id === 'rejected'}
        />
      </div>

      {selectedFilter && (
        <div className="rounded-xl border border-[#e8ecf2] bg-white shadow-sm flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="px-6 py-4 border-b border-[#e8ecf2] bg-[#f8fafc] flex justify-between items-center">
            <h2 className="text-lg font-bold text-[#0f1d33]">{selectedFilter.title}</h2>
            <button 
              onClick={() => setSelectedFilter(null)} 
              className="p-1 rounded-md text-[#5a6a82] hover:bg-[#e8ecf2] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="overflow-auto max-h-[60vh]">
            <table className="w-full text-xs text-left relative">
              <thead className="bg-[#f7f8fa] text-[#5a6a82] sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-medium w-16 text-[#1e3a5f]">Sr. No</th>
                  <th className="px-4 py-3 font-medium text-[#1e3a5f]">Lead Info</th>
                  <th className="px-4 py-3 font-medium text-[#1e3a5f]">Source</th>
                  <th className="px-4 py-3 font-medium text-[#1e3a5f]">Status</th>
                  <th className="px-4 py-3 font-medium text-[#1e3a5f]">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {isTableLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#5a6a82]">Loading leads...</td>
                  </tr>
                ) : tableLeads.length > 0 ? (
                  tableLeads.map((lead, index) => (
                    <tr key={lead.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-4 py-3 font-medium text-[#5a6a82]">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0f1d33]">{lead.name}</div>
                        <div className="text-xs text-[#5a6a82] flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" /> {lead.phone}
                        </div>
                        {lead.email && (
                          <div className="text-xs text-[#5a6a82] flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3" /> {lead.email}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 bg-[#f3f5f8] text-[#5a6a82] px-2 py-1 rounded text-[10px] font-medium border border-[#e8ecf2]">
                          {lead.source_page || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                          ${lead.status === 'new' ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : lead.status === 'contacted' ? 'bg-amber-50 text-amber-600 border border-amber-100'
                          : lead.status === 'uncontacted' ? 'bg-orange-50 text-orange-600 border border-orange-100'
                          : lead.status === 'qualified' ? 'bg-purple-50 text-purple-600 border border-purple-100'
                          : lead.status === 'closed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : lead.status === 'rejected' ? 'bg-red-50 text-red-600 border border-red-100'
                          : 'bg-gray-50 text-gray-600 border border-gray-100'}`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[#5a6a82]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {new Date(lead.created_at).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[#5a6a82]">No leads found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {tableCount > pageSize && (
            <div className="flex items-center justify-between border-t border-[#e8ecf2] bg-white px-4 py-3 sm:px-6">
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to <span className="font-medium">{Math.min(currentPage * pageSize, tableCount)}</span> of{' '}
                    <span className="font-medium">{tableCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || isTableLoading}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage * pageSize >= tableCount || isTableLoading}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DashboardCard({ 
  title, 
  value, 
  description, 
  icon,
  onClick,
  isSelected
}: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-xl border ${isSelected ? 'border-[#1e3a5f] ring-1 ring-[#1e3a5f] shadow-md' : 'border-[#e8ecf2] hover:border-[#c4a55a]'} bg-white p-6 shadow-sm cursor-pointer transition-all hover:shadow-md`}
    >
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className={`text-sm font-medium tracking-tight ${isSelected ? 'text-[#1e3a5f]' : 'text-[#5a6a82]'}`}>{title}</h3>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-[#0f1d33]">{value}</div>
        <p className="text-xs text-[#5a6a82] mt-1">{description}</p>
      </div>
    </div>
  );
}
