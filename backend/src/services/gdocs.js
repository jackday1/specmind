export function extractDocId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function detectDocType(url) {
  if (url.includes('/spreadsheets/')) return 'sheets';
  if (url.includes('/document/')) return 'docs';
  return 'docs';
}

export async function fetchGoogleDocText(url) {
  const docId = extractDocId(url);
  if (!docId) {
    throw new Error('Invalid Google Docs URL. Expected format: https://docs.google.com/document/d/DOC_ID/edit');
  }

  const docType = detectDocType(url);
  let exportUrl, acceptType, label;

  if (docType === 'sheets') {
    exportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv`;
    acceptType = 'text/csv';
    label = 'Sheet';
  } else {
    exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    acceptType = 'text/plain';
    label = 'Doc';
  }

  const response = await fetch(exportUrl, {
    redirect: 'follow',
    headers: { 'Accept': acceptType },
  });

  if (!response.ok) {
    throw new Error(
      'Could not access the Google document. Make sure it is shared with "Anyone with the link can view".'
    );
  }

  const text = await response.text();
  if (!text || text.trim().length === 0) {
    throw new Error('The Google document appears to be empty.');
  }

  let title = '';
  const disposition = response.headers.get('content-disposition');
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) {
      title = match[1].replace(/\.(txt|csv|html)$/i, '').trim();
    }
  }

  return { text, docId, docType, label, title };
}
