import { useState, useEffect } from 'preact/hooks';
import { inviteMember, getTeamInvites, removeInvite, getPlans, getMyTeam, startTrial } from '../api.js';

function MemberAvatar({ email, photoURL, isSelf, size }) {
  const s = size || '7';
  if (photoURL) {
    return <img src={photoURL} alt="" class={`w-${s} h-${s} object-cover`} referrerpolicy="no-referrer" />;
  }
  return (
    <div class={`w-${s} h-${s} flex items-center justify-center text-[10px] font-bold ${isSelf ? 'bg-[#f06543] text-white' : 'bg-[#1d1a17] text-[#8f887e] border border-[#2a2520]'}`}>
      {(email || '?')[0].toUpperCase()}
    </div>
  );
}

export default function TeamManagement({ team, user, isOwner, onTeamUpdate }) {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [planConfigs, setPlanConfigs] = useState({});
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [trialLoading, setTrialLoading] = useState('');
  const [trialError, setTrialError] = useState('');

  useEffect(() => { if (isOwner) loadInvites(); loadPlans(); refreshTeam(); }, [team._id]);

  const refreshTeam = async () => {
    try {
      const data = await getMyTeam();
      if (data.team) onTeamUpdate(data.team);
    } catch (err) { console.error(err); }
  };

  const loadPlans = async () => {
    try {
      const plans = await getPlans();
      const map = {};
      for (const p of plans) map[p.key] = p;
      setPlanConfigs(map);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (isOwner) loadInvites(); }, [team._id]);

  const loadInvites = async () => {
    try { setInvites((await getTeamInvites(team._id)).invitedEmails || []); } catch (err) { console.error(err); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setMessage('');
    try {
      const data = await inviteMember(email.trim());
      setInvites(data.team.invitedEmails || []);
      setEmail('');
      setMessage('sent');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleRemove = async (inviteEmail) => {
    try { setInvites((await removeInvite(team._id, inviteEmail)).invitedEmails || []); } catch (err) { setMessage(err.message); }
  };

  const members = team.members || [];
  const ownerMember = members.find((m) => m.role === 'owner') || { uid: team.ownerId, email: team.ownerEmail, photoURL: null };
  const otherMembers = members.filter((m) => m.role !== 'owner');
  const memberCount = members.length;
  const plan = planConfigs[team.plan] || planConfigs.free || { label: 'Free', maxMembers: 3, maxDocuments: 10, maxMessages: 20 };
  const isTrialActive = team.trialEndsAt && new Date(team.trialEndsAt) > new Date();
  const trialPlanConfig = isTrialActive ? (planConfigs[team.trialPlan] || plan) : null;
  const activePlan = trialPlanConfig || plan;
  const trialDaysLeft = isTrialActive ? Math.ceil((new Date(team.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  const handleStartTrial = async (planKey) => {
    setTrialLoading(planKey);
    setTrialError('');
    try {
      const data = await startTrial(planKey);
      onTeamUpdate(data.team);
      setShowPlanPicker(false);
    } catch (err) {
      setTrialError(err.message);
    } finally {
      setTrialLoading('');
    }
  };

  const upgradePlans = Object.values(planConfigs).filter((p) => p.key !== 'free').sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div class="flex items-center gap-4 mb-6">
        <div class="w-10 h-10 bg-[#f06543] text-white flex items-center justify-center text-sm font-bold">
          {team.name[0]?.toUpperCase()}
        </div>
        <div>
          <h2 class="text-lg font-semibold text-[#efe9e1]">{team.name}</h2>
          <p class="text-xs text-[#8f887e] mt-0.5">
            Created {new Date(team.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <span class={`badge ml-auto ${isTrialActive ? 'bg-[rgba(59,130,246,0.08)] text-[#539bf5] border-[rgba(83,155,245,0.15)]' : (team.trialPlan ? 'bg-[rgba(240,101,67,0.08)] text-[#f06543] border-[rgba(240,101,67,0.15)]' : 'bg-[rgba(99,99,86,0.08)] text-[#8f887e] border-[rgba(99,99,86,0.15)]')}`}>
          {isTrialActive ? `Trial · ${trialPlanConfig.label}` : activePlan.label} plan
        </span>
      </div>

      <div class="grid gap-6">
        <div class="card">
          <h3 class="text-sm font-semibold text-[#efe9e1] mb-3">Plan</h3>
          <div class="grid grid-cols-3 gap-x-8 gap-y-2">
            <div>
              <p class="text-[10px] text-[#635d56] mono uppercase">Members</p>
              <p class="text-sm text-[#efe9e1]">
                <span class="text-[#f06543]">{memberCount}</span>
                <span class="text-[#8f887e]"> / {activePlan.maxMembers}</span>
              </p>
            </div>
            <div>
              <p class="text-[10px] text-[#635d56] mono uppercase">Documents</p>
              <p class="text-sm text-[#efe9e1]">
                <span class="text-[#f06543]">{team.documentCount || 0}</span>
                <span class="text-[#8f887e]"> / {activePlan.maxDocuments}</span>
              </p>
            </div>
            <div>
              <p class="text-[10px] text-[#635d56] mono uppercase">Messages</p>
              <p class="text-sm text-[#efe9e1]">
                <span class="text-[#f06543]">{team.messageCount || 0}</span>
                <span class="text-[#8f887e]"> / {activePlan.maxMessages}</span>
              </p>
              <p class="text-[10px] text-[#635d56] mt-0.5">Resets monthly</p>
            </div>
          </div>
          {isTrialActive && (
            <div class="mt-3 pt-3 border-t border-[#2a2520]">
              <div class="flex items-center gap-2">
                <svg class="w-3.5 h-3.5 text-[#539bf5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <p class="text-xs text-[#539bf5]">
                  Trial active &middot; {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
                </p>
              </div>
            </div>
          )}
          {!isTrialActive && isOwner && !showPlanPicker && (
            <div class="mt-3 pt-3 border-t border-[#2a2520]">
              <button onClick={() => setShowPlanPicker(true)} class="text-xs text-[#f06543] hover:underline">
                {team.plan === 'free' ? 'Upgrade your plan' : 'Change plan'}
              </button>
            </div>
          )}
          {!isTrialActive && isOwner && showPlanPicker && (
            <div class="mt-3 pt-3 border-t border-[#2a2520]">
              <p class="text-xs text-[#efe9e1] font-medium mb-2">Try a plan free for 7 days</p>
              {trialError && (
                <div class="text-xs text-[#e5534b] bg-[rgba(229,83,75,0.06)] border border-[rgba(229,83,75,0.15)] px-3 py-2 mb-3">{trialError}</div>
              )}
              <div class="grid grid-cols-3 gap-2">
                {upgradePlans.map((p) => (
                  <div key={p.key} class="bg-[#1d1a17] border border-[#2a2520] p-3 text-center">
                    <p class="text-sm font-semibold text-[#efe9e1]">{p.label}</p>
                    <p class="text-[10px] text-[#8f887e] mt-0.5 mb-2">
                      {p.maxMembers} members &middot; {p.maxDocuments} docs &middot; {p.maxMessages} msgs
                    </p>
                    <button
                      onClick={() => handleStartTrial(p.key)}
                      disabled={!!trialLoading}
                      class="text-xs text-[#f06543] hover:underline disabled:opacity-50"
                    >
                      {trialLoading === p.key ? 'Starting...' : 'Start free trial'}
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => { setShowPlanPicker(false); setTrialError(''); }} class="text-[10px] text-[#8f887e] hover:text-[#efe9e1] mt-2">Cancel</button>
            </div>
          )}
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[#efe9e1]">Members</span>
              <span class="mono text-[10px] text-[#8f887e]">{memberCount}</span>
            </div>
          </div>

          <div class="border border-[#2a2520]">
            <div class="flex items-center gap-3 px-4 py-3 bg-[#1d1a17] border-b border-[#2a2520]">
              <MemberAvatar email={ownerMember.email} photoURL={ownerMember.photoURL} isSelf={isOwner} size="7" />
              <div class="flex-1 min-w-0">
                <p class="text-sm text-[#efe9e1] truncate">
                  {ownerMember.email || 'Owner'}{isOwner ? ' (you)' : ''}
                </p>
              </div>
              <span class="badge bg-[rgba(240,101,67,0.08)] text-[#f06543] border-[rgba(240,101,67,0.15)]">Owner</span>
            </div>

            {otherMembers.length > 0 ? (
              otherMembers.map((m) => {
                const isSelf = m.uid === user.uid;
                return (
                  <div key={m.uid} class={`flex items-center gap-3 px-4 py-3 border-b border-[#2a2520] last:border-b-0 transition-colors ${isSelf ? 'bg-[rgba(240,101,67,0.04)]' : 'bg-[#151311]'}`}>
                    <MemberAvatar email={m.email} photoURL={m.photoURL} isSelf={isSelf} size="7" />
                    <div class="flex-1 min-w-0">
                      <p class={`text-sm truncate ${isSelf ? 'font-medium text-[#efe9e1]' : 'text-[#d6d0c8]'}`}>
                        {m.email || 'Member'}{isSelf ? ' (you)' : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div class="px-4 py-8 text-center bg-[#151311]">
                <p class="text-xs text-[#635d56]">No other members yet</p>
                {isOwner && (
                  <p class="text-[10px] text-[#8f887e] mt-1">Invite teammates using the form below</p>
                )}
              </div>
            )}
          </div>
        </div>

        {isOwner && (
          <div class="card">
            <h3 class="text-sm font-semibold text-[#efe9e1] mb-4">Invite members</h3>

            {message === 'sent' && (
              <div class="flex items-center gap-2 text-xs text-[#3fb950] bg-[rgba(63,185,80,0.06)] border border-[rgba(63,185,80,0.15)] px-4 py-2.5 mb-4">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
                Invitation sent
              </div>
            )}
            {message && message !== 'sent' && (
              <div class="text-xs text-[#e5534b] bg-[rgba(229,83,75,0.06)] border border-[rgba(229,83,75,0.15)] px-4 py-2.5 mb-4">{message}</div>
            )}

            <form onSubmit={handleInvite} class="flex gap-2">
              <input type="email" value={email} onInput={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" required class="input-field flex-1" />
              <button type="submit" disabled={sending} class="btn-primary">{sending ? 'Sending...' : 'Send invite'}</button>
            </form>

            <p class="text-[10px] text-[#635d56] mt-3">
              Invited users will see the invitation the next time they log in. One email can only belong to one team.
            </p>

            {invites.length > 0 && (
              <div class="mt-5 pt-4 border-t border-[#2a2520]">
                <div class="flex items-center gap-2 mb-3">
                  <span class="mono text-[10px] text-[#8f887e] uppercase tracking-wider">Pending</span>
                  <span class="mono text-[10px] text-[#8f887e]">{invites.length}</span>
                </div>
                <div class="border border-[#2a2520]">
                  {invites.map((inviteEmail) => (
                    <div key={inviteEmail} class="flex items-center justify-between px-4 py-2.5 bg-[#151311] border-b border-[#2a2520] last:border-b-0">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 bg-[#1d1a17] border border-[#2a2520] flex items-center justify-center text-[10px] font-bold text-[#8f887e]">
                          {inviteEmail[0]?.toUpperCase()}
                        </div>
                        <span class="text-sm text-[#d6d0c8]">{inviteEmail}</span>
                      </div>
                      <button onClick={() => handleRemove(inviteEmail)} class="btn-ghost text-xs hover:text-[#e5534b]">Revoke</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
