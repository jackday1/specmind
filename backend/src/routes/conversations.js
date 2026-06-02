import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import Team from '../models/Team.js';
import Document from '../models/Document.js';
import { selectRelevantDocs, answerQuestion } from '../services/ai.js';

const router = Router();

async function getUserTeam(uid) {
  return Team.findOne({
    $or: [{ ownerId: uid }, { memberIds: uid }],
  });
}

router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversations = await Conversation.find({
      userId: req.user.uid,
      teamId: team._id,
      projectId,
    })
      .select('title updatedAt createdAt')
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversation = await Conversation.create({
      userId: req.user.uid,
      teamId: team._id,
      projectId,
      title: req.body.title || 'New conversation',
      messages: [],
    });

    res.status(201).json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.uid,
      teamId: team._id,
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.uid,
      teamId: team._id,
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    conversation.messages.push({
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    });

    if (!conversation.title || conversation.title === 'New conversation') {
      conversation.title = question.trim().slice(0, 80);
    }

    const docs = await Document.find({
      teamId: team._id,
      projectId: conversation.projectId,
      status: 'analyzed',
    }).select('name extractedText chunks');

    let answer;
    if (docs.length === 0) {
      answer = 'No analyzed documents are available yet. Please submit a Google Docs link for analysis first.';
    } else {
      const relevantDocs = await selectRelevantDocs(question.trim(), docs);
      answer = await answerQuestion(question.trim(), relevantDocs.length > 0 ? relevantDocs : docs.slice(0, 3));
    }

    conversation.messages.push({
      role: 'assistant',
      content: answer,
      timestamp: new Date(),
    });

    await conversation.save();

    res.json({ answer, conversation });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.uid,
      teamId: team._id,
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
