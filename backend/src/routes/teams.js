import { Router } from 'express';
import Team from '../models/Team.js';
import Member from '../models/Member.js';
import Document from '../models/Document.js';
import { checkMemberLimit, checkAcceptLimit } from '../services/plan.js';
import { getAuth } from '../services/firebase.js';

const router = Router();

async function getUserTeam(uid) {
  const team = await Team.findOne({ ownerId: uid });
  if (team) return team;
  const membership = await Member.findOne({ uid });
  if (!membership) return null;
  return Team.findById(membership.teamId);
}

async function getTeamMembers(teamId) {
  return Member.find({ teamId }).lean();
}

async function attachMembers(team) {
  if (!team) return team;
  const obj = team.toObject ? team.toObject() : team;
  obj.members = await getTeamMembers(obj._id);
  return obj;
}

async function getMemberCount(teamId) {
  return Member.countDocuments({ teamId });
}

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const existing = await getUserTeam(req.user.uid);
    if (existing) {
      return res.status(400).json({ error: 'You already belong to a team' });
    }

    const team = await Team.create({
      name: name.trim(),
      ownerId: req.user.uid,
      ownerEmail: req.user.email,
    });

    await Member.create({
      teamId: team._id,
      uid: req.user.uid,
      email: req.user.email?.toLowerCase(),
      photoURL: req.user.picture || null,
      role: 'owner',
    });

    res.status(201).json(await attachMembers(team));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) return res.json({ team: null });
    const result = await attachMembers(team);
    result.documentCount = await Document.countDocuments({ teamId: team._id });
    res.json({ team: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invitations', async (req, res) => {
  try {
    const userEmail = req.user.email?.toLowerCase();
    if (!userEmail) return res.json({ invitations: [] });

    const existing = await getUserTeam(req.user.uid);
    if (existing) return res.json({ invitations: [] });

    const teams = await Team.find({ invitedEmails: userEmail }).select('name ownerId createdAt');
    res.json({ invitations: teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/accept', async (req, res) => {
  try {
    const existing = await getUserTeam(req.user.uid);
    if (existing) {
      return res.status(400).json({ error: 'You already belong to a team' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const limitError = checkAcceptLimit(team, await getMemberCount(team._id));
    if (limitError) return res.status(403).json({ error: limitError });

    const userEmail = req.user.email?.toLowerCase();
    if (!team.invitedEmails.includes(userEmail)) {
      return res.status(403).json({ error: 'You have not been invited to this team' });
    }

    team.invitedEmails = team.invitedEmails.filter((e) => e !== userEmail);
    await team.save();

    await Member.create({
      teamId: team._id,
      uid: req.user.uid,
      email: userEmail,
      photoURL: req.user.picture || null,
      role: 'member',
    });

    res.json({ message: 'Joined team successfully', team: await attachMembers(team) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const member = await Member.findOne({ uid: req.user.uid, teamId: team._id });
    if (!member && team.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }
    res.json(await attachMembers(team));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invite', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const team = await Team.findOne({ ownerId: req.user.uid });
    if (!team) return res.status(404).json({ error: 'You are not an owner of any team' });

    const memberCount = await getMemberCount(team._id);
    const limitError = checkMemberLimit(team, memberCount);
    if (limitError) return res.status(403).json({ error: limitError });

    const normalizedEmail = email.toLowerCase().trim();

    const otherTeam = await Team.findOne({
      ownerId: { $ne: req.user.uid },
      invitedEmails: normalizedEmail,
    });

    if (otherTeam) {
      return res.status(400).json({ error: 'This email has a pending invitation to another team' });
    }

    if (team.invitedEmails.includes(normalizedEmail)) {
      return res.status(400).json({ error: 'Already invited' });
    }

    team.invitedEmails.push(normalizedEmail);
    await team.save();

    res.json({ message: 'Invitation sent', team: await attachMembers(team) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/invites', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only the team owner can view invites' });
    }
    res.json({ invitedEmails: team.invitedEmails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/invites/:email', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (team.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Only the team owner can remove invites' });
    }
    team.invitedEmails = team.invitedEmails.filter((e) => e !== req.params.email);
    await team.save();
    res.json({ invitedEmails: team.invitedEmails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
