import { Router } from 'express';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Team from '../models/Team.js';
import Member from '../models/Member.js';
import Document from '../models/Document.js';
import { selectRelevantDocs, answerQuestion } from '../services/ai.js';
import { checkMessageLimit } from '../services/plan.js';

const router = Router();

async function getUserTeam(uid) {
  const team = await Team.findOne({ ownerId: uid });
  if (team) return team;
  const membership = await Member.findOne({ uid });
  if (!membership) return null;
  return Team.findById(membership.teamId);
}

const MESSAGE_LIMIT = 100;

async function attachMessages(conversation) {
  if (!conversation) return conversation;
  const obj = conversation.toObject();
  const total = await Message.countDocuments({
    conversationId: conversation._id,
  });
  const messages = await Message.find({ conversationId: conversation._id })
    .sort({ timestamp: -1 })
    .limit(MESSAGE_LIMIT)
    .lean();
  obj.messages = messages.reverse();
  obj.hasMore = total > MESSAGE_LIMIT;
  return obj;
}

router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId)
      return res.status(400).json({ error: 'Project ID is required' });

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
    if (!projectId)
      return res.status(400).json({ error: 'Project ID is required' });

    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversation = await Conversation.create({
      userId: req.user.uid,
      teamId: team._id,
      projectId,
      title: req.body.title || 'New conversation',
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

    if (!conversation)
      return res.status(404).json({ error: 'Conversation not found' });

    res.json(await attachMessages(conversation));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/messages', async (req, res) => {
  try {
    const { before } = req.query;
    if (!before)
      return res.status(400).json({ error: 'before timestamp is required' });

    const team = await getUserTeam(req.user.uid);
    if (!team) return res.status(404).json({ error: 'You are not in a team' });

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.uid,
      teamId: team._id,
    });

    if (!conversation)
      return res.status(404).json({ error: 'Conversation not found' });

    const filter = {
      conversationId: conversation._id,
      timestamp: { $lt: new Date(before) },
    };
    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .sort({ timestamp: -1 })
      .limit(MESSAGE_LIMIT)
      .lean();

    res.json({ messages: messages.reverse(), hasMore: total > MESSAGE_LIMIT });
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

    const limitError = checkMessageLimit(team);
    if (limitError) return res.status(403).json({ error: limitError });

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user.uid,
      teamId: team._id,
    });

    if (!conversation)
      return res.status(404).json({ error: 'Conversation not found' });

    const now = new Date();

    await Message.create({
      conversationId: conversation._id,
      userId: req.user.uid,
      teamId: team._id,
      role: 'user',
      content: question.trim(),
      timestamp: now,
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
      answer =
        'No analyzed documents are available yet. Please submit a Google Docs link for analysis first.';
    } else {
      const relevantDocs = await selectRelevantDocs(question.trim(), docs);
      answer = await answerQuestion(
        question.trim(),
        relevantDocs.length > 0 ? relevantDocs : docs.slice(0, 3),
      );
    }

    await Message.create({
      conversationId: conversation._id,
      userId: req.user.uid,
      teamId: team._id,
      role: 'assistant',
      content: answer,
      timestamp: new Date(),
    });

    await conversation.save();

    await Team.findByIdAndUpdate(team._id, { $inc: { messageCount: 1 } });

    res.json({ answer, conversation: await attachMessages(conversation) });
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

    if (!conversation)
      return res.status(404).json({ error: 'Conversation not found' });

    await Message.deleteMany({ conversationId: req.params.id });

    res.json({ message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
