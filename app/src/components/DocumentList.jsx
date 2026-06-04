import { useState, useEffect } from 'preact/hooks';
import { getDocuments, deleteDocument } from '../api.js';

const statusConfig = {
  uploaded:   { label: 'Uploaded',   cls: 'text-[#f0a64b] bg-[rgba(240,166,75,0.08)] border-[rgba(240,166,75,0.15)]' },
  processing: { label: 'Processing', cls: 'text-[#539bf5] bg-[rgba(83,155,245,0.08)] border-[rgba(83,155,245,0.15)]' },
  analyzed:   { label: 'Analyzed',   cls: 'text-[#3fb950] bg-[rgba(63,185,80,0.08)] border-[rgba(63,185,80,0.15)]' },
  error:      { label: 'Error',      cls: 'text-[#e5534b] bg-[rgba(229,83,75,0.08)] border-[rgba(229,83,75,0.15)]' },
};

const countBadges = [
  { key: 'mismatches',    color: '#e5534b', label: 'M' },
  { key: 'unclear',       color: '#f0a64b', label: 'U' },
  { key: 'missingConfigs', color: '#f0a64b', label: 'C' },
];

export default function DocumentList({ onSelectDoc, projectId }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDocs(); }, []);

  const loadDocs = async () => {
    try { setDocs(await getDocuments(projectId)); } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try { await deleteDocument(id); setDocs((p) => p.filter((d) => d._id !== id)); }
    catch (err) { alert('Delete failed: ' + err.message); }
  };

  if (loading) return <div class="space-y-2">{ [1,2,3].map(i => <div key={i} class="card h-16 shimmer" />) }</div>;

  if (docs.length === 0) return (
    <div class="text-center py-16">
      <p class="text-sm text-[#8f887e]">No documents yet</p>
      <p class="text-xs text-[#635d56] mt-1">Paste a Google Docs link to get started</p>
    </div>
  );

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold text-[#efe9e1]">Documents</span>
          <span class="mono text-[10px] text-[#8f887e]">{docs.length}</span>
        </div>
      </div>
      <div class="space-y-px border border-[#2a2520]">
        {docs.map((doc) => {
          const s = statusConfig[doc.status] || statusConfig.uploaded;
          const analysis = doc.analysis;
          const hasAnalysis = doc.status === 'analyzed' && analysis;

          const totalIssues = hasAnalysis
            ? (analysis.mismatches?.filter((i) => !i.isResolved).length || 0)
              + (analysis.unclear?.filter((i) => !i.isResolved).length || 0)
              + (analysis.missingConfigs?.filter((i) => !i.isResolved).length || 0)
            : 0;

          const totalResolved = hasAnalysis
            ? (analysis.mismatches?.filter((i) => i.isResolved).length || 0)
              + (analysis.unclear?.filter((i) => i.isResolved).length || 0)
              + (analysis.missingConfigs?.filter((i) => i.isResolved).length || 0)
            : 0;

          return (
            <div key={doc._id} class="bg-[#151311] px-4 py-3 flex items-center justify-between group animate-fade-in">
              <div class="flex items-center gap-3 min-w-0">
                <svg class="w-4 h-4 text-[#635d56] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                  <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="text-sm text-[#efe9e1] truncate">{doc.name}</span>
                    <span class={`badge ${s.cls}`}>{s.label}</span>
                    {hasAnalysis && totalIssues > 0 && (
                      <span class="badge text-[#f0a64b] bg-[rgba(240,166,75,0.08)] border-[rgba(240,166,75,0.15)]">{totalIssues} issues</span>
                    )}
                    {hasAnalysis && totalResolved > 0 && (
                      <span class="badge text-[#3fb950] bg-[rgba(63,185,80,0.08)] border-[rgba(63,185,80,0.15)]">{totalResolved} fixed</span>
                    )}
                    {hasAnalysis && totalIssues === 0 && totalResolved === 0 && (
                      <span class="badge text-[#3fb950] bg-[rgba(63,185,80,0.08)] border-[rgba(63,185,80,0.15)]">Clean</span>
                    )}
                  </div>
                  <div class="flex items-center gap-3 text-[10px] text-[#635d56] mono mt-0.5">
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-1 ml-4">
                {hasAnalysis && countBadges.map(({ key, color, label }) => {
                  const count = analysis[key]?.filter((i) => !i.isResolved).length || 0;
                  if (count === 0) return null;
                  return (
                    <span
                      key={key}
                      class="mono text-[10px] font-medium px-1.5 py-0.5 border"
                      style={`color:${color};border-color:${color}33;background:${color}0f`}
                      title={`${count} ${key}`}
                    >
                      {label}{count}
                    </span>
                  );
                })}
                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  {doc.sourceUrl && (
                    <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer" class="btn-ghost text-xs inline-flex items-center gap-1">
                      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                      Open
                    </a>
                  )}
                  {doc.status === 'analyzed' && (
                    <button onClick={() => onSelectDoc(doc._id)} class="btn-ghost text-xs">View</button>
                  )}
                  <button onClick={() => handleDelete(doc._id)} class="btn-ghost text-xs hover:text-[#e5534b]">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
