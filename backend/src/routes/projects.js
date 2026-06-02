import { Router } from 'express';
import Project from '../models/Project.js';
import Team from '../models/Team.js';

const router = Router();

async function getUserTeam(uid) {
  return Team.findOne({
    $or: [{ ownerId: uid }, { memberIds: uid }],
  });
}

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const team = await Team.findOne({ ownerId: req.user.uid });
    if (!team) {
      return res.status(403).json({ error: 'Only team owners can create projects' });
    }

    const project = await Project.create({
      teamId: team._id,
      name: name.trim(),
      createdBy: req.user.uid,
    });

    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const projects = await Project.find({ teamId: team._id })
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const project = await Project.findOne({ _id: req.params.id, teamId: team._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const team = await Team.findOne({ ownerId: req.user.uid });
    if (!team) return res.status(403).json({ error: 'Only team owners can delete projects' });

    const project = await Project.findOneAndDelete({ _id: req.params.id, teamId: team._id });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
