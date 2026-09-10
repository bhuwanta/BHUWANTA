'use client';

import React, { useState, useEffect } from 'react';
import { Building2, Loader2, MapPin, FileText, Search, X } from 'lucide-react';
import { getMyProjectsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/_shared/sales/my-projects/actions';
import { getDocumentsForProjectsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/documents';
import MultiSelectFilter from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/ui/components/MultiSelectFilter';

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  // Which project's real, already-fetched documents are showing in the
  // popup right now — null means closed. The Map action alongside it
  // has no destination wired up yet (no functionality for now), so it's
  // deliberately left inert rather than faked.
  const [docsProjectId, setDocsProjectId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await getMyProjectsAction();
      if (res.success) {
        setProjects(res.data);
        const ids = res.data.map((p: any) => p.id);
        if (ids.length > 0) {
          const docsRes = await getDocumentsForProjectsAction(ids);
          if (docsRes.success) setDocuments(docsRes.data);
        }
      }
      setLoading(false);
    })();
  }, []);

  const formatPrice = (v: number | null) => (v == null ? '—' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v));

  const areaOptions = Array.from(new Set(projects.map((p) => p.s_areas?.name).filter(Boolean))).sort();

  const q = searchQuery.trim().toLowerCase();
  const filtered = projects.filter((p) => {
    if (selectedAreas.length > 0 && !selectedAreas.includes(p.s_areas?.name)) return false;
    if (!q) return true;
    return p.name.toLowerCase().includes(q) || (p.s_areas?.name || '').toLowerCase().includes(q);
  });

  const docsProject = docsProjectId ? projects.find((p) => p.id === docsProjectId) : null;
  const docsForOpenProject = docsProjectId ? documents.filter((d) => d.project_id === docsProjectId) : [];

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full flex flex-col">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
          <Building2 className="w-6 h-6 text-[#c4a55a]" />
          My Projects
        </h1>
        <p className="text-[#5a6a82] text-sm mt-1">Every project your Director is assigned to — pricing, map, and documents.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4 shrink-0">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a6a82]" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-[#e8ecf2] rounded-lg pl-9 pr-3 py-2 text-sm text-[#0f1d33] focus:outline-none focus:ring-1 focus:ring-[#c4a55a]"
          />
        </div>
        <MultiSelectFilter icon={MapPin} label="Area" options={areaOptions} selected={selectedAreas} onChange={setSelectedAreas} />
      </div>

      <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-[#5a6a82]">
            <Building2 className="w-10 h-10 text-[#e8ecf2] mx-auto mb-3" />
            {projects.length === 0 ? 'No projects assigned to your Director yet — ask IT/CEO/Governing Council to assign one.' : 'No projects match your search.'}
          </div>
        ) : (
          <div className="flex-1 overflow-auto min-h-0">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#f3f5f8] z-10">
                <tr className="text-[#5a6a82] text-xs uppercase tracking-wider font-semibold border-b border-[#e8ecf2] whitespace-nowrap">
                  <th className="p-3 w-14">Sr.No</th>
                  <th className="p-3">Project Name</th>
                  <th className="p-3">Base Price</th>
                  <th className="p-3">MRP</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8ecf2]">
                {filtered.map((project, index) => {
                  const projectDocCount = documents.filter((d) => d.project_id === project.id).length;
                  return (
                    <tr key={project.id} className="hover:bg-[#f7f8fa] transition-colors">
                      <td className="p-3 text-sm text-[#5a6a82]">{index + 1}</td>
                      <td className="p-3">
                        <p className="text-sm font-bold text-[#0f1d33] leading-snug">{project.name}</p>
                        {project.s_areas?.name && <p className="text-xs text-[#5a6a82] leading-snug">{project.s_areas.name}</p>}
                      </td>
                      <td className="p-3 text-sm text-[#0f1d33] font-medium whitespace-nowrap">{formatPrice(project.base_price)}/sq.yd</td>
                      <td className="p-3 text-sm text-[#0f1d33] font-medium whitespace-nowrap">{formatPrice(project.mrp_default)}/sq.yd</td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            title="Map view — coming soon"
                            disabled
                            className="p-2 rounded-lg border border-[#e8ecf2] text-[#a0abbb] cursor-not-allowed shrink-0"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDocsProjectId(project.id)}
                            title="Documents"
                            className="relative p-2 rounded-lg border border-[#e8ecf2] text-[#5a6a82] hover:bg-[#f3f5f8] hover:text-[#1e3a5f] transition-colors shrink-0"
                          >
                            <FileText className="w-4 h-4" />
                            {projectDocCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 bg-[#1e3a5f] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                                {projectDocCount > 9 ? '9+' : projectDocCount}
                              </span>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {docsProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDocsProjectId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[#e8ecf2] bg-[#f7f8fa] shrink-0">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#0f1d33] truncate">{docsProject.name}</h3>
                <p className="text-xs text-[#5a6a82]">Documents</p>
              </div>
              <button onClick={() => setDocsProjectId(null)} className="text-[#5a6a82] hover:text-[#0f1d33] transition-colors rounded-full p-1 hover:bg-[#e8ecf2] shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              {docsForOpenProject.length === 0 ? (
                <p className="text-sm text-[#a0abbb] italic text-center py-6">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {docsForOpenProject.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 text-sm text-[#1e3a5f] hover:text-[#c4a55a] hover:bg-[#f3f5f8] transition-colors rounded-lg p-2.5 border border-[#e8ecf2]"
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate">{doc.file_name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
