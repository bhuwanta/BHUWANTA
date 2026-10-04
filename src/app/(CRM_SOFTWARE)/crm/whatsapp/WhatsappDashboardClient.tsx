'use client'

import { useState, useMemo } from 'react'
import { MessageCircle, Download, PhoneCall, MapPin, X, ArrowRight, Activity, Clock, ShieldAlert } from 'lucide-react'
import { getWhatsappLeadsWithActivity } from './actions'

const renderActivityDetails = (details: string) => {
  if (!details) return null;
  
  if (details.includes('Message ID:') || details.includes('Provider timestamp:') || details.includes('Acquisition source and buying interest require verification.')) {
    const lines = details.split('\n');
    return (
      <div className="space-y-1.5 mt-2">
        {lines.map((line, i) => {
          if (line.includes('Acquisition source and buying interest require verification.')) {
            return (
              <div key={i} className="mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-start gap-1.5 leading-snug">
                <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{line}</span>
              </div>
            );
          }
          if (line.includes(': ')) {
            const [label, ...valueParts] = line.split(': ');
            const value = valueParts.join(': ');
            
            if (label === 'Message') {
              return (
                <div key={i} className="bg-white/80 p-2.5 rounded border border-white/40 shadow-sm my-2">
                  <span className="block text-xs font-bold text-[#1e3a5f] mb-1">{label}</span>
                  <span className="text-sm text-[#0f1d33] italic">"{value}"</span>
                </div>
              );
            }
            if (label === 'Message ID' || label.includes('referral') || label === 'Click-to-WhatsApp ID' || label === 'Provider timestamp') {
              return (
                <div key={i} className="text-[10px] flex gap-x-2">
                  <span className="font-semibold text-[#5a6a82]">{label}:</span>
                  <span className="text-[#5a6a82] break-all">{value}</span>
                </div>
              );
            }
            return (
              <div key={i} className="text-xs flex gap-x-2 bg-white/40 px-2 py-1 rounded">
                <span className="font-semibold text-[#1e3a5f]">{label}:</span>
                <span className="text-[#0f1d33] break-all font-medium">{value}</span>
              </div>
            );
          }
          return <div key={i} className="text-sm text-[#0f1d33] font-medium">{line}</div>;
        })}
      </div>
    );
  }
  return <p className="text-sm text-[#0f1d33] bg-white/60 p-2.5 rounded-lg border border-white/40 font-medium whitespace-pre-wrap break-words">{details}</p>;
};

export default function WhatsappDashboardClient({ initialLeads, totalCount = 0, userRole }: { initialLeads: any[], totalCount?: number, userRole: string }) {
  const [leads, setLeads] = useState(initialLeads)
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  
  const [currentPage, setCurrentPage] = useState(1)
  const [totalLeadsCount, setTotalLeadsCount] = useState(totalCount || initialLeads.length)
  const [isPageLoading, setIsPageLoading] = useState(false)
  const pageSize = 50

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > Math.ceil(totalLeadsCount / pageSize)) return;
    setIsPageLoading(true);
    try {
      const res = await getWhatsappLeadsWithActivity(newPage, pageSize);
      setLeads(res.data);
      setTotalLeadsCount(res.count);
      setCurrentPage(newPage);
    } catch (err) {
      console.error('Error fetching leads:', err);
    } finally {
      setIsPageLoading(false);
    }
  };

  // Analytics
  const totalLeads = leads.length
  const totalInteractions = leads.reduce((sum, lead) => sum + (lead.lead_activities?.length || 0), 0)
  const totalCallbacks = leads.filter(lead => 
    lead.lead_activities?.some((a: any) => a.activity_type === 'Requested Callback')
  ).length

  // Process leads for the table
  const processedLeads = useMemo(() => {
    return leads.map(lead => {
      const activities = lead.lead_activities || []
      
      // Get all downloaded items
      const downloads = activities
        .filter((a: any) => a.activity_type.includes('Downloaded'))
        .map((a: any) => ({ type: a.activity_type, project: a.details }))

      // Check for callback
      const requestedCallback = activities.some((a: any) => a.activity_type === 'Requested Callback')

      // Get latest area and project
      const latestArea = activities.slice().reverse().find((a: any) => a.activity_type === 'Area Selected')?.details || '-'
      const latestProject = activities.slice().reverse().find((a: any) => a.activity_type === 'Project Selected')?.details || '-'

      // Last active
      const lastActive = activities.length > 0 ? activities[activities.length - 1].created_at : lead.updated_at

      return {
        ...lead,
        downloads,
        requestedCallback,
        latestArea,
        latestProject,
        lastActive
      }
    }).sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime())
  }, [leads])

  const exportToCSV = () => {
    const headers = ['Name', 'Phone', 'Bot Interactions', 'Callback Requested', 'Latest Area', 'Latest Project', 'Last Active'];
    const csvContent = [
      headers.join(','),
      ...processedLeads.map(lead => [
        `"${lead.name || ''}"`,
        `"${lead.phone || ''}"`,
        lead.bot_interactions_count || 1,
        lead.requestedCallback ? 'YES' : 'NO',
        `"${lead.latestArea || ''}"`,
        `"${lead.latestProject || ''}"`,
        `"${new Date(lead.lastActive).toLocaleString()}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `whatsapp_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#f7f8fa] overflow-hidden">
      <div className="p-4 md:p-8 pb-4 md:pb-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              WhatsApp Command Center
            </h1>
            <p className="text-sm md:text-base text-[#5a6a82] mt-1">Detailed tracking and analytics for all WhatsApp bot interactions.</p>
          </div>
          <button
            onClick={exportToCSV}
            className="w-full sm:w-auto justify-center gradient-gold text-white font-semibold px-4 py-2.5 rounded-lg shadow-lg shadow-[#c4a55a]/20 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-8">
          <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e8ecf2] shadow-sm flex items-center gap-4">
            <div className="bg-blue-50 p-2 md:p-3 rounded-lg text-blue-600">
              <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-[#5a6a82] font-medium">Total WhatsApp Leads</p>
              <h3 className="text-xl md:text-2xl font-bold text-[#0f1d33]">{totalLeads}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e8ecf2] shadow-sm flex items-center gap-4">
            <div className="bg-purple-50 p-2 md:p-3 rounded-lg text-purple-600">
              <Activity className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-[#5a6a82] font-medium">Total Interactions</p>
              <h3 className="text-xl md:text-2xl font-bold text-[#0f1d33]">{totalInteractions}</h3>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 md:p-6 border border-[#e8ecf2] shadow-sm flex items-center gap-4">
            <div className="bg-orange-50 p-2 md:p-3 rounded-lg text-orange-600">
              <PhoneCall className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-[#5a6a82] font-medium">Callbacks Requested</p>
              <h3 className="text-xl md:text-2xl font-bold text-[#0f1d33]">{totalCallbacks}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 md:px-8 pb-4 md:pb-8 flex flex-col min-h-0">
        <div className="bg-white rounded-xl border border-[#e8ecf2] shadow-sm flex flex-col overflow-hidden h-[65vh] md:h-full">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-auto">
            <table className="w-full text-left text-xs text-[#5a6a82] relative">
              <thead className="bg-[#f3f5f8] text-xs uppercase font-semibold text-[#1e3a5f] sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 w-12 text-[#1e3a5f]">Sr. No</th>
                  <th className="px-3 py-2">Lead Info</th>
                  <th className="px-3 py-2">Latest Area</th>
                  <th className="px-3 py-2">Latest Project</th>
                  <th className="px-3 py-2">Downloads</th>
                  <th className="px-3 py-2 text-center">Callback Requested?</th>
                  <th className="px-3 py-2">Last Active</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {processedLeads.length > 0 ? (
                  processedLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-[#f8fafc] transition-colors">
                      <td className="px-3 py-2 text-[#5a6a82] font-medium">
                        {(currentPage - 1) * pageSize + processedLeads.indexOf(lead) + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-[#0f1d33]">{lead.name}</div>
                        <div className="text-xs text-[#5a6a82]">{lead.phone}</div>
                        {lead.bot_interactions_count > 1 && (
                          <span className="inline-flex mt-1 items-center rounded bg-[#c4a55a]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#c4a55a] border border-[#c4a55a]/20">
                            {lead.bot_interactions_count}x Returns
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md text-gray-700 font-medium">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {lead.latestArea}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-[#1e3a5f]">
                        {lead.latestProject}
                      </td>
                      <td className="px-3 py-2">
                        {lead.downloads.length > 0 ? (
                          <div className="flex flex-col gap-1.5">
                            {lead.downloads.slice(0, 2).map((d: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded max-w-[220px]" title={`${d.type.replace('Downloaded ', '')} (${d.project})`}>
                                <Download className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{d.type.replace('Downloaded ', '')} ({d.project})</span>
                              </div>
                            ))}
                            {lead.downloads.length > 2 && (
                              <div className="text-[10px] font-bold text-[#5a6a82] uppercase tracking-wider pl-1 mt-0.5">
                                +{lead.downloads.length - 2} More
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {lead.requestedCallback ? (
                          <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full font-bold shadow-sm">
                            <PhoneCall className="h-4 w-4" />
                            YES
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 px-3 py-1.5 rounded-full font-medium">
                            <X className="h-4 w-4" />
                            NO
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-gray-400" />
                          {new Date(lead.lastActive).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-3 py-2 rounded-lg hover:bg-[#0f1d33] transition-colors text-sm font-medium"
                        >
                          View History <ArrowRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-[#5a6a82]">
                      No WhatsApp leads found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col divide-y divide-[#e8ecf2] overflow-y-auto">
            {processedLeads.length > 0 ? (
              processedLeads.map((lead) => (
                <div key={`mobile-lead-${lead.id}`} className="p-4 flex flex-col gap-3 hover:bg-[#f8fafc] transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-[#0f1d33] text-base">{lead.name}</div>
                      <div className="text-sm text-[#5a6a82] font-medium">{lead.phone}</div>
                      {lead.bot_interactions_count > 1 && (
                        <span className="inline-flex mt-1 items-center rounded bg-[#c4a55a]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#c4a55a] border border-[#c4a55a]/20">
                          {lead.bot_interactions_count}x Returns
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {lead.requestedCallback ? (
                        <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold shadow-sm">
                          <PhoneCall className="h-3 w-3" /> YES
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-xs font-medium">
                          <X className="h-3 w-3" /> NO
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#5a6a82]">Latest Area</span>
                      <span className="inline-flex items-center gap-1 bg-gray-50 px-2 py-1 rounded text-[#1e3a5f] text-xs font-medium border border-[#e8ecf2]">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span className="truncate">{lead.latestArea}</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-[#5a6a82]">Latest Project</span>
                      <span className="inline-flex items-center gap-1 bg-[#f3f5f8] px-2 py-1 rounded text-[#1e3a5f] text-xs font-medium border border-[#e8ecf2]">
                        <span className="truncate">{lead.latestProject}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-xs text-[#5a6a82]">Downloads</span>
                    {lead.downloads.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {lead.downloads.map((d: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 max-w-full">
                            <Download className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{d.type.replace('Downloaded ', '')} ({d.project})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">None</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center mt-2 pt-3 border-t border-[#e8ecf2]">
                    <div className="flex items-center gap-1.5 text-xs text-[#5a6a82]">
                      <Clock className="h-3 w-3" />
                      {new Date(lead.lastActive).toLocaleString()}
                    </div>
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="inline-flex items-center gap-1 bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:bg-[#0f1d33] transition-colors text-xs font-medium shadow-sm"
                    >
                      View History <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-[#5a6a82]">
                No WhatsApp leads found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Panel for Detailed History */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-[#0f1d33]/20 backdrop-blur-sm" onClick={() => setSelectedLead(null)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-[#e8ecf2] animate-in slide-in-from-right duration-300">
            
            <div className="flex items-center justify-between p-6 border-b border-[#e8ecf2] bg-[#f3f5f8]">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2.5 rounded-full text-green-600">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[#0f1d33]">Full Activity Log</h2>
                  <p className="text-sm text-[#5a6a82]">{selectedLead.name} ({selectedLead.phone})</p>
                </div>
              </div>
              <button onClick={() => setSelectedLead(null)} className="p-2 text-[#5a6a82] hover:text-[#0f1d33] hover:bg-white rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {selectedLead.lead_activities?.length > 0 ? (
                <div className="relative border-l-2 border-[#e8ecf2] ml-4 pl-6 space-y-8 pb-10">
                  {selectedLead.lead_activities.map((activity: any, idx: number) => {
                    const isCallback = activity.activity_type === 'Requested Callback'
                    const isDownload = activity.activity_type.includes('Downloaded')
                    
                    return (
                      <div key={idx} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                          isCallback ? 'bg-orange-500' : isDownload ? 'bg-blue-500' : 'bg-[#c4a55a]'
                        }`}></div>
                        
                        <div className={`rounded-xl p-4 border ${
                          isCallback ? 'bg-orange-50 border-orange-100' : isDownload ? 'bg-blue-50 border-blue-100' : 'bg-[#f3f5f8] border-[#e8ecf2]'
                        }`}>
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <span className={`font-bold text-sm ${
                              isCallback ? 'text-orange-700' : isDownload ? 'text-blue-700' : 'text-[#1e3a5f]'
                            }`}>
                              {activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                            </span>
                            <span className="text-[11px] text-[#5a6a82] whitespace-nowrap bg-white/60 px-2 py-0.5 rounded-full border border-white/40">
                              {new Date(activity.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          
                          {activity.details && renderActivityDetails(activity.details)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#5a6a82]">
                  <MessageCircle className="h-12 w-12 text-[#e8ecf2] mb-4" />
                  <p>No activity recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
