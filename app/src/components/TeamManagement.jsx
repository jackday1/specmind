import { useState, useEffect } from 'preact/hooks';
import { inviteMember, getTeamInvites, removeInvite } from '../api.js';

export default function TeamManagement({ team, user, isOwner, onTeamUpdate }) {
  const [email, setEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');

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

  const getMemberEmail = (uid) => {
    const idx = team.memberIds?.indexOf(uid);
    return (idx !== -1 && idx < (team.memberEmails?.length || 0)) ? team.memberEmails[idx] : null;
  };

  const memberCount = team.memberIds?.length || 1;
  const otherMembers = team.memberIds?.filter((id) => id !== team.ownerId) || [];

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
        {isOwner && (
          <span class="badge bg-[rgba(240,101,67,0.08)] text-[#f06543] border-[rgba(240,101,67,0.15)] ml-auto">Owner</span>
        )}
      </div>

      <div class="grid gap-6">
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-semibold text-[#efe9e1]">Members</span>
              <span class="mono text-[10px] text-[#8f887e]">{memberCount}</span>
            </div>
          </div>

          <div class="border border-[#2a2520]">
            <div class="flex items-center gap-3 px-4 py-3 bg-[#1d1a17] border-b border-[#2a2520]">
              <div class="w-7 h-7 bg-[#f06543] text-white flex items-center justify-center text-[10px] font-bold">
                {(team.ownerEmail || team.name)[0]?.toUpperCase()}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm text-[#efe9e1] truncate">
                  {team.ownerEmail || 'Owner'}{isOwner ? ' (you)' : ''}
                </p>
              </div>
              <span class="badge bg-[rgba(240,101,67,0.08)] text-[#f06543] border-[rgba(240,101,67,0.15)]">Owner</span>
            </div>

            {otherMembers.length > 0 ? (
              otherMembers.map((id) => {
                const isSelf = id === user.uid;
                const memberEmail = getMemberEmail(id);
                return (
                  <div key={id} class={`flex items-center gap-3 px-4 py-3 border-b border-[#2a2520] last:border-b-0 transition-colors ${isSelf ? 'bg-[rgba(240,101,67,0.04)]' : 'bg-[#151311]'}`}>
                    <div class={`w-7 h-7 flex items-center justify-center text-[10px] font-bold ${isSelf ? 'bg-[#f06543] text-white' : 'bg-[#1d1a17] text-[#8f887e] border border-[#2a2520]'}`}>
                      {(memberEmail || id)[0].toUpperCase()}
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class={`text-sm truncate ${isSelf ? 'font-medium text-[#efe9e1]' : 'text-[#d6d0c8]'}`}>
                        {memberEmail || 'Member'}{isSelf ? ' (you)' : ''}
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
              <input
                type="email"
                value={email}
                onInput={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                class="input-field flex-1"
              />
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

        {!isOwner && otherMembers.length === 0 && (
          <div class="card">
            <p class="text-xs text-[#8f887e]">You're the only member. Ask the team owner to invite more people.</p>
          </div>
        )}
      </div>
    </div>
  );
}
