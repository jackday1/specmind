import { Router, route } from 'preact-router';
import { useState, useEffect } from 'preact/hooks';
import DocumentInput from '../components/DocumentInput.jsx';
import DocumentList from '../components/DocumentList.jsx';
import AnalysisResults from '../components/AnalysisResults.jsx';
import TeamManagement from '../components/TeamManagement.jsx';
import ChatView from '../components/Chat.jsx';
import ProjectSelector from '../components/ProjectSelector.jsx';
import { getProjects, createProject } from '../api.js';

function DocumentsPage({ projectId, refreshTrigger, submittedDocId, onViewed, onSelectDoc }) {
  const [selectedDocId, setSelectedDocId] = useState(null);

  useEffect(() => {
    if (submittedDocId) {
      setSelectedDocId(submittedDocId);
      if (onViewed) onViewed();
    }
  }, [submittedDocId]);

  useEffect(() => { setSelectedDocId(null); }, [refreshTrigger]);

  const handleBack = () => {
    setSelectedDocId(null);
    route('/documents');
  };

  if (!projectId) return null;

  if (selectedDocId) {
    return (
      <div class="animate-fade-in">
        <AnalysisResults docId={selectedDocId} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div class="space-y-6 animate-fade-in">
      <DocumentInput projectId={projectId} onSubmitted={onSelectDoc} />
      <DocumentList key={refreshTrigger} projectId={projectId} onSelectDoc={setSelectedDocId} />
    </div>
  );
}

function NoProjectScreen({ isOwner, onCreate }) {
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError('');
    try {
      const proj = await createProject(name.trim());
      onCreate(proj);
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  if (!isOwner) {
    return (
      <div class="flex-1 flex items-center justify-center">
        <div class="text-center">
          <svg class="w-8 h-8 text-[#635d56] mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p class="text-sm text-[#efe9e1] font-medium mb-1">No projects yet</p>
          <p class="text-xs text-[#8f887e]">Ask the team owner to create a project first.</p>
        </div>
      </div>
    );
  }

  return (
    <div class="flex-1 flex items-center justify-center">
      <div class="text-center max-w-sm">
        <svg class="w-10 h-10 text-[#635d56] mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <h2 class="text-lg font-semibold text-[#efe9e1] mb-2">Create your first project</h2>
        <p class="text-sm text-[#8f887e] mb-6">Projects organize your specs and knowledge base. Each project has its own documents and chat.</p>

        {error && (
          <div class="text-xs text-[#e5534b] bg-[rgba(229,83,75,0.06)] border border-[rgba(229,83,75,0.15)] px-4 py-2.5 mb-4">{error}</div>
        )}

        <form onSubmit={handleCreate} class="flex gap-2">
          <input
            type="text"
            value={name}
            onInput={(e) => { setName(e.target.value); setError(''); }}
            placeholder="e.g. Game Design v2"
            class="input-field flex-1"
            autofocus
            disabled={creating}
          />
          <button type="submit" disabled={!name.trim() || creating} class="btn-primary">
            {creating ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TeamLayout({ team, user, onTeamUpdate, onLogout }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [submittedDocId, setSubmittedDocId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);

  const isOwner = team.ownerId === user.uid;

  useEffect(() => { loadProjects(); }, []);

  const loadProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
      if (data.length > 0) {
        setProjectId(data[0]._id);
      }
    } catch (err) { console.error(err); }
  };

  const handleProjectChange = (id) => {
    setProjectId(id);
    setRefreshTrigger((t) => t + 1);
  };

  const handleProjectCreated = (proj) => {
    setProjects((prev) => [...prev, proj]);
    setProjectId(proj._id);
  };

  const handleSubmitted = (doc) => {
    setSubmittedDocId(doc._id);
    route('/documents');
  };

  const handleViewed = () => {
    setSubmittedDocId(null);
  };

  const handleRoute = ({ url }) => {
    setCurrentPath(url);
  };

  const NAV = [
    { path: '/',          icon: 'M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', label: 'Chat' },
    { path: '/documents', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Documents' },
    { path: '/team',      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', label: 'Team' },
  ];

  return (
    <div class="min-h-screen flex flex-col bg-[#0c0b0a]">
      <header class="border-b border-[#2a2520] bg-[#0c0b0a] sticky top-0 z-50">
        <div class="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div class="flex items-center gap-3">
            <a href="/" class="flex items-center gap-2 no-underline">
              <svg class="w-4 h-4 text-[#f06543]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M8 8h8M8 12h5M8 16h8" stroke-linecap="round"/>
              </svg>
            </a>
            <div class="hidden sm:block">
              <span class="mono text-[10px] text-[#8f887e] uppercase tracking-wider">SpecMind</span>
              <span class="text-[#635d56] mx-2">/</span>
              <span class="text-xs text-[#8f887e]">{team.name}</span>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <ProjectSelector
              projects={projects}
              selectedId={projectId}
              isOwner={isOwner}
              onChange={handleProjectChange}
              onCreated={handleProjectCreated}
            />
            {user.photoURL && (
              <img src={user.photoURL} alt="" class="w-6 h-6 object-cover hidden md:block" referrerpolicy="no-referrer" />
            )}
            <span class="text-xs text-[#8f887e] hidden md:inline">{user.email}</span>
            <button onClick={onLogout} class="btn-ghost text-xs">Sign out</button>
          </div>
        </div>

        {projects.length > 0 && (
          <div class="max-w-6xl mx-auto px-4">
            <div class="flex">
              {NAV.map(({ path, icon, label }) => (
                <a
                  key={path}
                  href={path}
                  class={`relative flex items-center gap-2 px-3 py-2.5 text-xs font-medium no-underline transition-colors ${
                    currentPath === path ? 'text-[#f06543]' : 'text-[#8f887e] hover:text-[#efe9e1]'
                  }`}
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d={icon} />
                  </svg>
                  <span class="hidden sm:inline">{label}</span>
                  {currentPath === path && (
                    <span class="absolute bottom-0 left-3 right-3 h-px bg-[#f06543]" />
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {projects.length === 0 ? (
        <NoProjectScreen isOwner={isOwner} onCreate={handleProjectCreated} />
      ) : (
        <main class="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6">
          <Router onChange={handleRoute}>
            <DocumentsPage path="/documents" projectId={projectId} refreshTrigger={refreshTrigger} submittedDocId={submittedDocId} onViewed={handleViewed} onSelectDoc={handleSubmitted} />
            <TeamManagement path="/team" team={team} user={user} isOwner={isOwner} onTeamUpdate={onTeamUpdate} />
            <ChatView default projectId={projectId} teamId={team._id} />
          </Router>
        </main>
      )}
    </div>
  );
}
