import { getStorage } from './firebase.js';
import { v4 as uuidv4 } from 'uuid';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function uploadToStorage(fileBuffer, fileName, mimeType) {
  const bucket = getStorage();
  const uniqueName = `documents/${uuidv4()}-${fileName}`;
  const file = bucket.file(uniqueName);

  await file.save(fileBuffer, {
    metadata: { contentType: mimeType },
  });

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return { firebasePath: uniqueName, url };
}

export async function extractText(fileBuffer, mimeType) {
  if (mimeType === 'application/pdf') {
    const data = await pdfParse(fileBuffer);
    return data.text;
  }

  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword') {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    return result.value;
  }

  if (mimeType === 'text/plain') {
    return fileBuffer.toString('utf-8');
  }

  throw new Error('Unsupported file type: ' + mimeType);
}

export function chunkText(text, maxChunkSize = 2000) {
  const chunks = [];
  const paragraphs = text.split(/\n\n+/);

  let current = '';
  for (const para of paragraphs) {
    if ((current.length + para.length) > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}
