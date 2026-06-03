import { useState } from 'preact/hooks';
import { submitDocLink } from '../api.js';

export default function DocumentInput({ projectId, onSubmitted }) {
  const [url, setUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!trimmed.includes('docs.google.com/document/d/') && !trimmed.includes('docs.google.com/spreadsheets/d/')) {
      setError('Please enter a valid Google Docs or Sheets URL');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const doc = await submitDocLink(trimmed, projectId);
      setUrl('');
      onSubmitted(doc);
    } catch (err) {
      if (err.existingDocId) {
        setUrl('');
        onSubmitted({ _id: err.existingDocId });
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div class="border-2 border-dashed border-[#2a2520] hover:border-[#3d3730] p-12 text-center transition-all duration-200">
      {submitting ? (
        <div>
          <div class="w-6 h-6 mx-auto mb-3 border-2 border-[#f06543] border-t-transparent animate-spin" />
          <p class="text-sm text-[#8f887e]">Fetching document...</p>
        </div>
      ) : (
        <div>
          <svg class="w-6 h-6 text-[#635d56] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <h3 class="text-sm font-medium text-[#efe9e1] mb-1">Paste Google Docs or Sheets link</h3>
          <p class="text-xs text-[#8f887e] mb-4">
            Make sure it's shared with <span class="text-[#efe9e1]">Anyone with the link can view</span>
          </p>

          <form onSubmit={handleSubmit} class="max-w-md mx-auto">
            <div class="flex gap-2">
              <input
                type="url"
                value={url}
                onInput={(e) => { setUrl(e.target.value); setError(''); }}
                placeholder="https://docs.google.com/document/d/..."
                class="input-field flex-1"
              />
              <button type="submit" disabled={!url.trim() || submitting} class="btn-primary">
                Analyze
              </button>
            </div>
          </form>

          {error && (
            <p class="text-xs text-[#e5534b] mt-3">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
