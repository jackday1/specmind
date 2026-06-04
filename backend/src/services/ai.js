import OpenAI from 'openai';
import { config } from '../config.js';
import { getRedis } from './redis.js';

const openai = new OpenAI({
  baseURL: config.openai.baseURL,
  apiKey: config.openai.apiKey,
});

const ANALYSIS_SYSTEM_PROMPT = `You are a technical spec reviewer. Analyze the specification document and identify issues.

For each issue you find, also provide a specific, actionable suggestion on how to fix it.

Output your findings as a JSON object with this exact structure:
{
  "mismatches": [
    { "content": "The API endpoint docs say /users but the examples use /user", "suggestion": "Standardize on /users throughout the doc and update all example requests to match" }
  ],
  "unclear": [
    { "content": "The retry policy is described as 'reasonable backoff' without specifics", "suggestion": "Specify exact backoff parameters, e.g. exponential backoff starting at 1s with a max of 30s and up to 3 retries" }
  ],
  "missingConfigs": [
    { "content": "Database connection timeout is not defined", "suggestion": "Add a DB_CONNECTION_TIMEOUT env var with a default of 30 seconds" }
  ],
  "devQuestions": [
    { "content": "Should pagination be cursor-based or offset-based?", "suggestion": "Use cursor-based pagination for better performance on large datasets; specify the cursor parameter name (e.g. 'after') and response format" }
  ]

Rules:
- Each array can contain zero or more items
- Each item MUST have both "content" (the issue) and "suggestion" (how to fix it) fields
- Return ONLY valid JSON — no markdown code fences, no extra text`;

const REANALYZE_PROMPT = `You are a technical spec reviewer re-checking a specification document. You will receive both the OLD version and the NEW version. Compare them carefully.

Step 1 — Identify what changed:
- Compare the two versions and summarize the actual changes made (sections added, removed, or modified)
- Only mark an issue as fixed if the relevant part of the document was genuinely updated to address it

Step 2 — Previous issues to check:

{previousIssues}

Step 3 — Output your findings as a JSON object with this structure:
{
  "changesSummary": "Brief summary of what changed between the two versions. If nothing meaningful changed, say 'No significant changes detected.'",
  "mismatches": [
    { "content": "issue that still exists", "suggestion": "how to fix it" }
  ],
  "unclear": [...],
  "missingConfigs": [...],
  "devQuestions": [...],
  "fixed": {
    "mismatches": ["exact content text of issue that is now fixed"],
    "unclear": ["exact content text of issue that is now fixed"],
    "missingConfigs": ["exact content text of issue that is now fixed"],
    "devQuestions": ["exact content text of issue that is now fixed"]
  }
}

CRITICAL RULES:
- The "fixed" list must ONLY contain issues whose exact text was addressed by actual document changes. If the relevant section was NOT changed, the issue is NOT fixed.
- If the document has no meaningful changes, all previous issues must remain in the active lists and the "fixed" lists must be empty.
- Copy the exact "content" text from the previous issues list into the "fixed" list — do not paraphrase.
- Each array can contain zero or more items
- Each active issue MUST have both "content" and "suggestion" fields
- Return ONLY valid JSON — no markdown code fences, no extra text`;

export async function analyzeDocument(text, previousIssues, oldText) {
  const systemPrompt = previousIssues
    ? REANALYZE_PROMPT.replace('{previousIssues}', previousIssues)
    : ANALYSIS_SYSTEM_PROMPT;

  let userContent;
  if (oldText) {
    userContent = `=== OLD DOCUMENT VERSION ===\n${oldText.slice(0, 15000)}\n\n=== NEW DOCUMENT VERSION ===\n${text.slice(0, 15000)}`;
  } else {
    userContent = text.slice(0, 30000);
  }

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.3,
  });

  const raw = response.choices[0].message.content;
  return parseAnalysis(raw);
}

function parseAnalysis(raw) {
  const sections = {
    mismatches: [],
    unclear: [],
    missingConfigs: [],
    devQuestions: [],
    fixed: null,
    changesSummary: '',
  };

  // Primary path: parse JSON (the prompt now requests JSON directly)
  const jsonResult = tryJsonParse(raw);
  if (jsonResult) {
    for (const key of ['mismatches', 'unclear', 'missingConfigs', 'devQuestions']) {
      if (Array.isArray(jsonResult[key])) {
        sections[key] = jsonResult[key].map((item) =>
          typeof item === 'string'
            ? { content: item, suggestion: '', isResolved: false }
            : { content: item.content || '', suggestion: item.suggestion || '', isResolved: false }
        );
      }
    }

    if (jsonResult.fixed && typeof jsonResult.fixed === 'object') {
      sections.fixed = {};
      for (const key of ['mismatches', 'unclear', 'missingConfigs', 'devQuestions']) {
        if (Array.isArray(jsonResult.fixed[key])) {
          sections.fixed[key] = jsonResult.fixed[key].filter((f) => typeof f === 'string' && f.trim());
        }
      }
    }

    if (jsonResult.changesSummary) {
      sections.changesSummary = jsonResult.changesSummary;
    }

    const total = Object.values(sections).reduce((s, a) => {
      if (Array.isArray(a)) return s + a.length;
      return s;
    }, 0);
    if (total > 0) return sections;
  }

  // Fallback: parse markdown format
  const sectionMap = {
    'Mismatches': 'mismatches',
    'Unclear': 'unclear',
    'Missing Configs': 'missingConfigs',
    'Dev Questions': 'devQuestions',
  };

  let currentKey = null;

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = trimmed.match(/^##\s+(Mismatches|Unclear|Missing\s+Configs|Dev\s+Questions)\s*$/i);
    if (headerMatch) {
      const name = headerMatch[1].replace(/\s+/g, ' ');
      currentKey = sectionMap[name] || null;
      continue;
    }

    if (currentKey && trimmed.startsWith('- ')) {
      const item = trimmed.slice(2).trim();
      if (item && item.toLowerCase() !== 'none') {
        sections[currentKey].push({ content: item, suggestion: '', isResolved: false });
      }
    }
  }

  return sections;
}

function tryJsonParse(raw) {
  try {
    let cleaned = raw.trim()
      .replace(/^```json?\s*/i, '')
      .replace(/\s*```$/, '');
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function selectRelevantDocs(question, documents) {
  if (documents.length === 0) return [];
  if (documents.length === 1) return documents;

  const docList = documents
    .map((d, i) => `[${i}] ${d.name}`)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `You are a document selector. Given a user question and a list of documents, return ONLY a JSON object with an "indices" array of relevant document numbers. Example: {"indices": [0, 2]}. Do not include any other text.`,
      },
      {
        role: 'user',
        content: `Question: ${question}\n\nDocuments:\n${docList}`,
      },
    ],
    temperature: 0,
  });

  const raw = response.choices[0].message.content;
  const parsed = tryJsonParse(raw);
  const indices = parsed?.indices || [];
  return indices.map((i) => documents[i]).filter(Boolean);
}

export async function answerQuestion(question, selectedDocs) {
  const context = selectedDocs
    .map((d) => `--- Document: ${d.name} ---\n${d.extractedText?.slice(0, 15000) || d.chunks?.join('\n')?.slice(0, 15000) || ''}`)
    .join('\n\n');

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions about specification documents. Use the provided document context to answer the user's question accurately. If the answer cannot be found in the documents, say so. Be concise and specific. Cite document names when referencing information.`,
      },
      {
        role: 'user',
        content: `Context from specification documents:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.4,
  });

  return response.choices[0].message.content;
}

export async function* answerQuestionStream(question, selectedDocs) {
  const context = selectedDocs
    .map((d) => `--- Document: ${d.name} ---\n${d.extractedText?.slice(0, 15000) || d.chunks?.join('\n')?.slice(0, 15000) || ''}`)
    .join('\n\n');

  const stream = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that answers questions about specification documents. Use the provided document context to answer the user's question accurately. If the answer cannot be found in the documents, say so. Be concise and specific. Cite document names when referencing information.`,
      },
      {
        role: 'user',
        content: `Context from specification documents:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
    temperature: 0.4,
    stream: true,
  });

  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta?.content || '';
  }
}

const CHAT_HISTORY_PREFIX = 'chat:history:';
const CHAT_HISTORY_TTL = 86400 * 7;

export async function getChatHistory(teamId, limit = 50) {
  const redis = getRedis();
  if (!redis) return [];
  const key = `${CHAT_HISTORY_PREFIX}${teamId}`;
  const messages = await redis.lrange(key, -limit, -1);
  return messages.map((m) => JSON.parse(m));
}

export async function addChatMessage(teamId, message) {
  const redis = getRedis();
  if (!redis) return;
  const key = `${CHAT_HISTORY_PREFIX}${teamId}`;
  await redis.rpush(key, JSON.stringify(message));
  await redis.expire(key, CHAT_HISTORY_TTL);
  await redis.ltrim(key, -200, -1);
}
