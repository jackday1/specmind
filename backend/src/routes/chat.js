import { Router } from 'express';
import Team from '../models/Team.js';
import Document from '../models/Document.js';
import { selectRelevantDocs, answerQuestion, getChatHistory, addChatMessage } from '../services/ai.js';

const router = Router();

router.post('/', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const team = await Team.findOne({
      $or: [{ ownerId: req.user.uid }, { memberIds: req.user.uid }],
    });
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const docs = await Document.find({
      teamId: team._id,
      status: 'analyzed',
    }).select('name extractedText chunks');

    await addChatMessage(team._id, {
      role: 'user',
      content: question,
      user: req.user.name || req.user.email,
      timestamp: new Date().toISOString(),
    });

    let answer;
    if (docs.length === 0) {
      answer = 'No analyzed documents are available yet. Please upload and analyze a specification document first.';
    } else {
      const relevantDocs = await selectRelevantDocs(question, docs);
      answer = await answerQuestion(question, relevantDocs.length > 0 ? relevantDocs : docs.slice(0, 3));
    }

    await addChatMessage(team._id, {
      role: 'assistant',
      content: answer,
      timestamp: new Date().toISOString(),
    });

    res.json({ answer });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const team = await Team.findOne({
      $or: [{ ownerId: req.user.uid }, { memberIds: req.user.uid }],
    });
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const history = await getChatHistory(team._id);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
