'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Loader2, Download } from 'lucide-react';
import { getMyRegistrationsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/customer-registrations';
import { getDocumentsForProjectsAction } from '@/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/role/platform/data/documents';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const regsRes = await getMyRegistrationsAction();
      if (regsRes.success) {
        const projectIds = Array.from(new Set(regsRes.data.map((r: any) => r.s_projects?.id).filter(Boolean)));
        const names: Record<string, string> = {};
        regsRes.data.forEach((r: any) => {
          if (r.s_projects?.id) names[r.s_projects.id] = r.s_projects.name;
        });
        setProjectNames(names);

        const docsRes = await getDocumentsForProjectsAction(projectIds as string[]);
        if (docsRes.success) setDocuments(docsRes.data);
      }
      setLoading(false);
    })();
  }, []);

  const DOC_TYPE_LABEL: Record<string, string> = { brochure: 'Brochure', layout: 'Layout', linkdocument: 'Link Document' };
  const DOC_TYPE_CLASS: Record<string, string> = { brochure: 'bg-emerald-50 text-emerald-600', layout: 'bg-purple-50 text-purple-600', linkdocument: 'bg-amber-50 text-amber-600' };

  return (
    <div className="p-4 md:p-6 bg-[#f7f8fa] h-full">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f1d33] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#c4a55a]" />
            Documents
          </h1>
          <p className="text-[#5a6a82] text-sm mt-1">Brochures, layouts, and other documents for your booked project(s).</p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#c4a55a]" />
          </div>
        ) : documents.length === 0 ? (
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl p-12 text-center text-[#5a6a82]">No documents uploaded yet for your project(s).</div>
        ) : (
          <div className="bg-white border border-[#e8ecf2] shadow-sm rounded-xl divide-y divide-[#e8ecf2]">
            {documents.map((doc) => (
              <div key={doc.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-[#1e3a5f]/10 p-2 rounded-lg text-[#1e3a5f] shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0f1d33] truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-[#5a6a82]">{projectNames[doc.project_id] || 'Project'}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${DOC_TYPE_CLASS[doc.document_type]}`}>{DOC_TYPE_LABEL[doc.document_type] || doc.document_type}</span>
                    </div>
                  </div>
                </div>
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-[#1e3a5f] hover:bg-[#1e3a5f]/10 rounded-lg transition-colors shrink-0" title="Download">
                  <Download className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
