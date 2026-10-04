'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import { Users, UserCheck, TrendingUp, PhoneCall, CheckCircle } from 'lucide-react'

type Lead = {
  id: string
  name: string
  email: string
  phone: string | null
  status: string
  source_page: string
  project: string | null
  downloaded_item: string | null
  created_at: string
}

interface ReportsClientProps {
  initialLeads: Lead[]
}

const COLORS = ['#1e3a5f', '#c4a55a', '#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']

export default function ReportsClient({ initialLeads }: ReportsClientProps) {
  
  // Aggregate data
  const metrics = useMemo(() => {
    const total = initialLeads.length
    const newLeads = initialLeads.filter(l => l.status === 'new').length
    const contacted = initialLeads.filter(l => l.status === 'contacted').length
    const qualified = initialLeads.filter(l => l.status === 'qualified').length
    const closed = initialLeads.filter(l => l.status === 'closed').length

    return { total, newLeads, contacted, qualified, closed }
  }, [initialLeads])

  const statusData = useMemo(() => {
    return [
      { name: 'New', value: metrics.newLeads },
      { name: 'Contacted', value: metrics.contacted },
      { name: 'Qualified', value: metrics.qualified },
      { name: 'Closed', value: metrics.closed },
    ].filter(item => item.value > 0)
  }, [metrics])

  const sourceData = useMemo(() => {
    const sources = initialLeads.reduce((acc, lead) => {
      const source = lead.source_page || 'Unknown'
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(sources).map(key => ({
      name: key,
      value: sources[key]
    })).sort((a, b) => b.value - a.value)
  }, [initialLeads])

  const projectData = useMemo(() => {
    const projects = initialLeads.reduce((acc, lead) => {
      const project = lead.project || 'Unspecified'
      acc[project] = (acc[project] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(projects).map(key => ({
      name: key,
      value: projects[key]
    })).sort((a, b) => b.value - a.value)
  }, [initialLeads])

  const downloadData = useMemo(() => {
    const downloads = initialLeads.reduce((acc, lead) => {
      if (lead.downloaded_item) {
        acc[lead.downloaded_item] = (acc[lead.downloaded_item] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    return Object.keys(downloads).map(key => ({
      name: key,
      value: downloads[key]
    })).sort((a, b) => b.value - a.value)
  }, [initialLeads])

  const recentLeadsData = useMemo(() => {
    // Group by month
    const months = initialLeads.reduce((acc, lead) => {
      const date = new Date(lead.created_at)
      const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' })
      acc[monthYear] = (acc[monthYear] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.keys(months).map(key => ({
      name: key,
      Leads: months[key]
    })).reverse() // Show chronological if initially sorted descending
  }, [initialLeads])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0f1d33]">Reports & Analytics</h1>
        <p className="mt-2 text-sm text-[#5a6a82]">
          Track your lead acquisition and performance metrics.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          title="Total Leads" 
          value={metrics.total} 
          icon={<Users className="w-5 h-5 text-[#1e3a5f]" />} 
          bg="bg-[#f3f5f8]"
        />
        <MetricCard 
          title="New Leads" 
          value={metrics.newLeads} 
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />} 
          bg="bg-blue-50"
        />
        <MetricCard 
          title="Contacted" 
          value={metrics.contacted} 
          icon={<PhoneCall className="w-5 h-5 text-amber-500" />} 
          bg="bg-amber-50"
        />
        <MetricCard 
          title="Qualified" 
          value={metrics.qualified} 
          icon={<UserCheck className="w-5 h-5 text-purple-500" />} 
          bg="bg-purple-50"
        />
        <MetricCard 
          title="Closed" 
          value={metrics.closed} 
          icon={<CheckCircle className="w-5 h-5 text-emerald-500" />} 
          bg="bg-emerald-50"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Status Distribution (Pie) */}
        <div className="bg-white p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-lg font-semibold text-[#0f1d33] mb-6">Leads by Status</h3>
          {statusData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

        {/* Source Distribution (Bar) */}
        <div className="bg-white p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-lg font-semibold text-[#0f1d33] mb-6">Leads by Source Page</h3>
          {sourceData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf2" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    tickFormatter={(val) => val.length > 18 ? val.substring(0, 18) + '...' : val}
                    tick={{ fill: '#5a6a82', fontSize: 11 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f5f8' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#c4a55a" radius={[0, 4, 4, 0]}>
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

        {/* Project Interest (Bar) */}
        <div className="bg-white p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-lg font-semibold text-[#0f1d33] mb-6">Project Interest</h3>
          {projectData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf2" />
                  <XAxis 
                    dataKey="name" 
                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 13) + '...' : val}
                    tick={{ fill: '#5a6a82', fontSize: 11 }} 
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip 
                    cursor={{ fill: '#f3f5f8' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

        {/* Leads Over Time (Line or Bar) */}
        <div className="bg-white p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-lg font-semibold text-[#0f1d33] mb-6">Leads Over Time (Months)</h3>
          {recentLeadsData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentLeadsData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8ecf2" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#5a6a82', fontSize: 11 }} 
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip 
                    cursor={{ fill: '#f3f5f8' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="Leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

        {/* Downloaded Documents (Bar) */}
        <div className="bg-white p-6 rounded-xl border border-[#e8ecf2] shadow-sm">
          <h3 className="text-lg font-semibold text-[#0f1d33] mb-6">Downloaded Documents</h3>
          {downloadData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={downloadData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8ecf2" />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={130} 
                    tickFormatter={(val) => val.length > 18 ? val.substring(0, 18) + '...' : val}
                    tick={{ fill: '#5a6a82', fontSize: 11 }} 
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f5f8' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e8ecf2', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                    {downloadData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-[#5a6a82]">No data available</div>
          )}
        </div>

      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, bg }: { title: string, value: number, icon: React.ReactNode, bg: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-[#e8ecf2] shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[#5a6a82] text-sm font-medium">{title}</h3>
        <div className={`p-2 rounded-lg ${bg}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-[#0f1d33]">
        {value}
      </div>
    </div>
  )
}
