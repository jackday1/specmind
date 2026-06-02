import { useState, useEffect } from 'preact/hooks';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.js';
import { getMyTeam, getInvitations, createTeam, acceptInvitation } from '../api.js';
import TeamLayout from './TeamLayout.jsx';

export default function Dashboard({ user }) {
  const [team, setTeam] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(null);

  const loadData = async () => {
    try {
      const [teamData, invData] = await Promise.all([getMyTeam(), getInvitations()]);
      setTeam(teamData.team);
      setInvitations(invData.invitations);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await createTeam(teamName);
      setTeam(data);
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAccept = async (teamId) => {
    setAccepting(teamId);
    setError('');
    try {
      const data = await acceptInvitation(teamId);
      setTeam(data.team);
    } catch (err) {
      setError(err.message);
      setAccepting(null);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-[#0c0b0a]">
        <span class="text-sm text-[#8f887e]">Loading...</span>
      </div>
    );
  }

  if (team) {
    return <TeamLayout team={team} user={user} onTeamUpdate={setTeam} onLogout={handleLogout} />;
  }

  return (
    <div class="min-h-screen flex items-center justify-center px-6 bg-[#0c0b0a]">
      <div class="w-full max-w-lg animate-fade-in">
        <div class="flex justify-between items-center mb-10">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-[#f06543]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M8 8h8M8 12h5M8 16h8" stroke-linecap="round"/>
            </svg>
            <span class="mono text-[10px] text-[#8f887e] uppercase tracking-wider">SpecMind</span>
          </div>
          <button onClick={handleLogout} class="btn-ghost">Sign out</button>
        </div>

        {invitations.length > 0 && (
          <div class="mb-8">
            <div class="mono text-[10px] text-[#8f887e] uppercase tracking-wider mb-3">
              Pending invitations
            </div>
            <div class="space-y-0">
              {invitations.map((inv) => (
                <div key={inv._id} class="card flex items-center justify-between border-l-2 border-l-[#f06543] animate-fade-in">
                  <div>
                    <h3 class="text-sm font-semibold text-[#efe9e1]">{inv.name}</h3>
                    <p class="text-xs text-[#8f887e] mt-0.5">You've been invited to join</p>
                  </div>
                  <button
                    onClick={() => handleAccept(inv._id)}
                    disabled={accepting === inv._id}
                    class="btn-primary"
                  >
                    {accepting === inv._id ? 'Joining...' : 'Accept'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div class="card">
          <h2 class="text-sm font-semibold text-[#efe9e1] mb-4">Get started</h2>

          {error && (
            <div class="text-sm text-[#e5534b] bg-[rgba(229,83,75,0.06)] border border-[rgba(229,83,75,0.15)] px-4 py-3 mb-4">{error}</div>
          )}

          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} class="btn-primary w-full justify-center">
              Create a Team
            </button>
          ) : (
            <form onSubmit={handleCreate} class="space-y-4">
              <div>
                <label class="block text-[10px] mono text-[#8f887e] uppercase tracking-wider mb-1.5">Team name</label>
                <input
                  type="text"
                  value={teamName}
                  onInput={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Project Apollo"
                  required
                  class="input-field"
                  autofocus
                />
              </div>
              <div class="flex gap-2">
                <button type="submit" class="btn-primary flex-1">Create team</button>
                <button type="button" onClick={() => { setShowCreate(false); setError(''); }} class="btn-secondary">Cancel</button>
              </div>
            </form>
          )}
        </div>

        <p class="text-center text-[10px] text-[#635d56] mt-8 mono">
          No team yet. Create one or wait for an invitation.
        </p>
      </div>
    </div>
  );
}
