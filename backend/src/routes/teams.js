import { Router } from 'express';
import Team from '../models/Team.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const existing = await Team.findOne({
      $or: [{ ownerId: req.user.uid }, { memberIds: req.user.uid }],
    });
    if (existing) {
      return res.status(400).json({ error: 'You already belong to a team' });
    }

    const team = await Team.create({
      name: name.trim(),
      ownerId: req.user.uid,
      ownerEmail: req.user.email,
      memberIds: [req.user.uid],
      memberEmails: [req.user.email?.toLowerCase()],
    });

    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/mine', async (req, res) => {
  try {
    const team = await Team.findOne({
      $or: [{ ownerId: req.user.uid }, { memberIds: req.user.uid }],
    });

    if (!team) {
      return res.json({ team: null });
    }

    res.json({ team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/invitations', async (req, res) => {
  try {
    const userEmail = req.user.email?.toLowerCase();
    if (!userEmail) {
      return res.json({ invitations: [] });
    }

    const existing = await Team.findOne({
      $or: [{ ownerId: req.user.uid }, { memberIds: req.user.uid }],
    });
    if (existing) {
      return res.json({ invitations: [] });
    }

    const teams = await Team.find({ invitedEmails: userEmail }).select('name ownerId createdAt');
    res.json({ invitations: teams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/accept', async (req, res) => {
  try {
    const existing = await Team.findOne({
      $or: [{ ownerId: req.user.uid }, { memberIds: req.user.uid }],
    });
    if (existing) {
      return res.status(400).json({ error: 'You already belong to a team' });
    }

    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const userEmail = req.user.email?.toLowerCase();
    if (!team.invitedEmails.includes(userEmail)) {
      return res.status(403).json({ error: 'You have not been invited to this team' });
    }

    team.memberIds.push(req.user.uid);
    team.memberEmails.push(userEmail);
    team.invitedEmails = team.invitedEmails.filter((e) => e !== userEmail);
    await team.save();

    res.json({ message: 'Joined team successfully', team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (!team.memberIds.includes(req.user.uid)) {
      return res.status(403).json({ error: 'Not a member of this team' });
    }
    res.json(team);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invite', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const team = await Team.findOne({ ownerId: req.user.uid });
    if (!team) {
      return res.status(404).json({ error: 'You are not an owner of any team' });
    }

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

    res.json({ message: 'Invitation sent', team });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/invites', async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
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
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
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
