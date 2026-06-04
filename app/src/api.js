import { auth } from './firebase.js';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function getToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

async function request(path, options = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || 'Request failed');
    if (err.existingDocId) error.existingDocId = err.existingDocId;
    throw error;
  }
  return res.json();
}

export async function getMyTeam() {
  return request('/teams/mine');
}

export async function createTeam(name) {
  return request('/teams', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function getInvitations() {
  return request('/teams/invitations');
}

export async function acceptInvitation(teamId) {
  return request(`/teams/${teamId}/accept`, { method: 'POST' });
}

export async function inviteMember(email) {
  return request('/teams/invite', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function getTeamInvites(teamId) {
  return request(`/teams/${teamId}/invites`);
}

export async function removeInvite(teamId, email) {
  return request(`/teams/${teamId}/invites/${encodeURIComponent(email)}`, { method: 'DELETE' });
}

export async function getDocuments(projectId) {
  return request(`/documents?projectId=${projectId}`);
}

export async function getDocument(id) {
  return request(`/documents/${id}`);
}

export async function submitDocLink(url, projectId) {
  return request('/documents/link', { method: 'POST', body: JSON.stringify({ url, projectId }) });
}

export async function reanalyzeDocument(id) {
  return request(`/documents/${id}/reanalyze`, { method: 'POST' });
}

export async function deleteDocument(id) {
  return request(`/documents/${id}`, { method: 'DELETE' });
}

export async function askQuestion(question) {
  return request('/chat', { method: 'POST', body: JSON.stringify({ question }) });
}

export async function getChatHistory() {
  return request('/chat/history');
}

export async function getConversations(projectId) {
  return request(`/conversations?projectId=${projectId}`);
}

export async function createConversation(title, projectId) {
  return request('/conversations', { method: 'POST', body: JSON.stringify({ title, projectId }) });
}

export async function getConversation(id) {
  return request(`/conversations/${id}`);
}

export async function askConversation(id, question) {
  return request(`/conversations/${id}/ask`, { method: 'POST', body: JSON.stringify({ question }) });
}

export async function askConversationStream(id, question, { onChunk, onDone, onError, signal }) {
  const token = await getToken();
  const res = await fetch(`${BASE}/conversations/${id}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ question, stream: true }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.error) {
          onError(data.error);
          return;
        }
        if (data.done) {
          onDone(data.conversation);
          return;
        }
        if (data.chunk !== undefined) {
          onChunk(data.chunk);
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}

export async function loadMoreMessages(id, before) {
  return request(`/conversations/${id}/messages?before=${encodeURIComponent(before)}`);
}

export async function deleteConversation(id) {
  return request(`/conversations/${id}`, { method: 'DELETE' });
}

export async function getProjects() {
  return request('/projects');
}

export async function createProject(name) {
  return request('/projects', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function deleteProject(id) {
  return request(`/projects/${id}`, { method: 'DELETE' });
}

export async function getPlans() {
  return request('/plans');
}

export async function startTrial(planKey) {
  return request('/teams/start-trial', { method: 'POST', body: JSON.stringify({ planKey }) });
}
