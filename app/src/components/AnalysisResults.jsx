import { useState, useEffect, useRef } from 'preact/hooks';
import { getDocument, reanalyzeDocument } from '../api.js';

const sections = [
  { key: 'mismatches',   label: 'Mismatched',    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z', lc: 'border-l-[#e5534b]', tc: 'text-[#e5534b]', bg: 'bg-[rgba(229,83,75,0.06)] border-[rgba(229,83,75,0.15)]' },
  { key: 'unclear',      label: 'Unclear',       icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', lc: 'border-l-[#f0a64b]', tc: 'text-[#f0a64b]', bg: 'bg-[rgba(240,166,75,0.06)] border-[rgba(240,166,75,0.15)]' },
  { key: 'missingConfigs', label: 'Missing config', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', lc: 'border-l-[#f0a64b]', tc: 'text-[#f0a64b]', bg: 'bg-[rgba(240,166,75,0.06)] border-[rgba(240,166,75,0.15)]' },
  { key: 'devQuestions',  label: 'Dev questions',  icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', lc: 'border-l-[#539bf5]', tc: 'text-[#539bf5]', bg: 'bg-[rgba(83,155,245,0.06)] border-[rgba(83,155,245,0.15)]' },
];

function AnalyzingView({ docName, phase }) {
  return (
    <div class="flex flex-col items-center py-16 gap-4">
      <div class="w-8 h-8 border-2 border-[#f06543] border-t-transparent animate-spin" />
      <div class="text-center">
        <p class="text-sm text-[#efe9e1] font-medium mb-1">
          {phase === 'reanalyzing' ? 'Re-analyzing' : 'Analyzing'} {docName}
        </p>
        <p class="text-xs text-[#8f887e]">AI is reviewing for mismatches, unclear requirements, missing configs, and developer questions</p>
      </div>
      <div class="flex gap-2 mt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} class="w-2 h-2 animate-pulse" style={{
            backgroundColor: ['#e5534b', '#f0a64b', '#f0a64b', '#539bf5'][i],
            animationDelay: `${i * 0.15}s`
          }} />
        ))}
      </div>
    </div>
  );
}

export default function AnalysisResults({ docId, onBack }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const pollRef = useRef(null);

  const loadDoc = async (id) => {
    try {
      const d = await getDocument(id);
      setDoc(d);
      setReanalyzing(false);
      if (d.status === 'uploaded' || d.status === 'processing') {
        pollRef.current = setTimeout(() => loadDoc(id), 1500);
      }
    } catch (err) {
      console.error(err);
      setDoc(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!docId) return;
    setLoading(true);
    setReanalyzing(false);
    loadDoc(docId);
    return () => clearTimeout(pollRef.current);
  }, [docId]);

  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      await reanalyzeDocument(docId);
      loadDoc(docId);
    } catch (err) {
      alert('Re-analyze failed: ' + err.message);
      setReanalyzing(false);
    }
  };

  if (!docId) return (
    <div class="text-center py-16">
      <p class="text-sm text-[#8f887e] mb-4">Select a document to view analysis</p>
      {onBack && <button onClick={onBack} class="btn-secondary">Browse documents</button>}
    </div>
  );

  if (loading) return <div class="space-y-3 pt-4">{ [1,2,3,4].map(i => <div key={i} class="card h-20 shimmer" />) }</div>;

  if (!doc) return (
    <div class="text-center py-16">
      <p class="text-sm text-[#8f887e] mb-2">Document not found</p>
      {onBack && <button onClick={onBack} class="btn-secondary">Back</button>}
    </div>
  );

  if (doc.status === 'error') return (
    <div class="text-center py-16">
      <p class="text-sm text-[#e5534b] mb-2">Analysis failed</p>
      <p class="text-xs text-[#8f887e] mb-4">Make sure the Google Doc is shared with "Anyone with the link can view"</p>
      {onBack && <button onClick={onBack} class="btn-secondary">Back</button>}
    </div>
  );

  const isProcessing = doc.status === 'uploaded' || doc.status === 'processing';

  if (isProcessing || reanalyzing) {
    return (
      <div>
        <div class="flex items-center gap-4 mb-2">
          {onBack && (
            <button onClick={onBack} class="text-[#8f887e] hover:text-[#efe9e1] transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          )}
          <div>
            <h2 class="text-sm font-semibold text-[#efe9e1]">{doc.name}</h2>
            <span class="badge text-[#539bf5] bg-[rgba(83,155,245,0.08)] border-[rgba(83,155,245,0.15)] mt-0.5 inline-block">
              {reanalyzing ? 'Re-analyzing' : 'Analyzing'}
            </span>
          </div>
        </div>
        <AnalyzingView docName={doc.name} phase={reanalyzing ? 'reanalyzing' : 'analyzing'} />
      </div>
    );
  }

  const { analysis } = doc;

  return (
    <div class="space-y-4">
      <div class="flex items-center gap-4 mb-2">
        {onBack && (
          <button onClick={onBack} class="text-[#8f887e] hover:text-[#efe9e1] transition-colors">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div>
          <h2 class="text-sm font-semibold text-[#efe9e1]">{doc.name}</h2>
          <p class="text-[10px] text-[#635d56] mono mt-0.5">Analyzed {new Date(doc.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      {doc.previousAnalysis && (
        <div class="flex items-center gap-3 px-3 py-2 bg-[#1d1a17] border border-[#2a2520]">
          {(() => {
            const totalResolved = Object.values(analysis).reduce(
              (s, items) => s + (items || []).filter((i) => i.isResolved).length, 0
            );
            const totalRemaining = Object.values(analysis).reduce(
              (s, items) => s + (items || []).filter((i) => !i.isResolved).length, 0
            );
            return (
              <>
                {totalResolved > 0 && <><span class="mono text-[10px] text-[#3fb950]">{totalResolved} resolved</span><span class="text-[#635d56] mx-1">·</span></>}
                <span class="mono text-[10px] text-[#f0a64b]">{totalRemaining} remaining</span>
                {totalRemaining === 0 && <><span class="text-[#635d56] mx-1">·</span><span class="mono text-[10px] text-[#3fb950]">All clear</span></>}
              </>
            );
          })()}
        </div>
      )}

      <div class="grid gap-3">
        {sections.map(({ key, label, icon, lc, tc, bg }) => {
          const rawItems = analysis[key] || [];
          const items = rawItems.map((item) =>
            typeof item === 'string' ? { content: item, isResolved: false } : item
          );
          const unresolved = items.filter((i) => !i.isResolved);
          const resolved = items.filter((i) => i.isResolved);

          return (
            <div key={key} class={`border-l-2 ${lc} bg-[#151311] border border-[#2a2520] border-l-2 p-4`}>
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-2">
                  <svg class={`w-4 h-4 ${tc}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d={icon} />
                  </svg>
                  <h3 class={`text-xs font-semibold ${tc}`}>{label}</h3>
                  <span class={`badge ${bg} ${tc}`}>
                    {unresolved.length}
                    {resolved.length > 0 && ` + ${resolved.length} resolved`}
                  </span>
                </div>
              </div>
              {items.length > 0 ? (
                <ul class="space-y-3">
                  {items.map((item, i) => (
                    <li key={i} class={item.isResolved ? 'opacity-60' : ''}>
                      <div class={`flex items-start gap-2 text-xs leading-relaxed ${item.isResolved ? 'text-[#3fb950]/70 line-through' : 'text-[#d6d0c8]'}`}>
                        <span class={`w-1 h-1 mt-1.5 shrink-0 ${item.isResolved ? 'bg-[#3fb950]' : tc.replace('text-', 'bg-')}`} />
                        {item.content}
                      </div>
                      {item.suggestion && (
                        <div class={`ml-3.5 mt-1 pl-3 border-l-2 border-[#2a2520] text-[11px] leading-relaxed ${item.isResolved ? 'text-[#3fb950]/40' : 'text-[#8f887e]'}`}>
                          <span class="mono text-[10px] tracking-wide text-[#635d56]">SUGGESTION </span>
                          {item.suggestion}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p class="text-[10px] text-[#635d56] mono">No issues found</p>
              )}
            </div>
          );
        })}
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-[#2a2520]">
        <p class="text-xs text-[#8f887e]">Update your Google Doc to fix the issues, then re-analyze.</p>
        <button
          onClick={handleReanalyze}
          disabled={reanalyzing}
          class="btn-primary text-xs inline-flex items-center gap-1.5"
        >
          {reanalyzing ? (
            <>
              <div class="w-3 h-3 border border-white border-t-transparent animate-spin" />
              Analyzing...
            </>
          ) : (
            'Re-analyze'
          )}
        </button>
      </div>
    </div>
  );
}
