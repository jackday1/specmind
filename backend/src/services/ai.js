import OpenAI from 'openai';
import { config } from '../config.js';
import { getRedis } from './redis.js';

const openai = new OpenAI({
  baseURL: config.openai.baseURL,
  apiKey: config.openai.apiKey,
});

const ANALYSIS_SYSTEM_PROMPT = `You are a technical spec reviewer. Analyze the specification document and identify issues.

Output your findings in EXACTLY this format with these exact section headers:

## Mismatches
- [issue description]

## Unclear
- [issue description]

## Missing Configs
- [issue description]

## Dev Questions
- [question description]

Rules:
- Each bullet point must start with "- " on its own line
- If a section has no issues, write "None" as the only bullet
- Do NOT include any other text, explanations, or markdown outside these sections`;

const REANALYZE_PROMPT = `You are a technical spec reviewer re-checking a specification that was updated based on previous feedback.

Below are the issues found in the PREVIOUS version. The document has been updated. Re-analyze it and:

1. For each previous issue that is FIXED — do NOT include it in your output
2. For each previous issue that STILL EXISTS — include it again
3. For any NEW issues you find — include them

Previous issues:

{previousIssues}

Output your NEW findings in EXACTLY this format:

## Mismatches
- [issue description]

## Unclear
- [issue description]

## Missing Configs
- [issue description]

## Dev Questions
- [question description]

Rules:
- Each bullet point must start with "- " on its own line
- If a section has no issues, write "None" as the only bullet
- Do NOT include any other text outside these sections`;

export async function analyzeDocument(text, previousIssues) {
  const systemPrompt = previousIssues
    ? REANALYZE_PROMPT.replace('{previousIssues}', previousIssues)
    : ANALYSIS_SYSTEM_PROMPT;

  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text.slice(0, 30000) },
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
  };

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
        sections[currentKey].push({ content: item, isResolved: false });
      }
    }
  }

  // If parsing yielded nothing, try JSON as fallback
  const total = Object.values(sections).reduce((s, a) => s + a.length, 0);
  if (total === 0) {
    const jsonResult = tryJsonParse(raw);
    if (jsonResult) {
      for (const key of Object.keys(sections)) {
        if (Array.isArray(jsonResult[key])) {
          sections[key] = jsonResult[key].map((item) =>
            typeof item === 'string' ? { content: item, isResolved: false } : item
          );
        }
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
