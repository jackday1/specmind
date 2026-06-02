import { Router } from 'express';
import Document from '../models/Document.js';
import Team from '../models/Team.js';
import { fetchGoogleDocText } from '../services/gdocs.js';
import { analyzeDocument } from '../services/ai.js';
import { chunkText } from '../services/storage.js';

const router = Router();

async function getUserTeam(uid) {
  return Team.findOne({
    $or: [{ ownerId: uid }, { memberIds: uid }],
  });
}

async function runAnalysis(docId, text) {
  try {
    await Document.findByIdAndUpdate(docId, { status: 'processing' });

    const doc = await Document.findById(docId).select('previousAnalysis');
    const chunks = chunkText(text);

    let previousIssues = null;
    if (doc?.previousAnalysis) {
      const parts = [];
      for (const key of ['mismatches', 'unclear', 'missingConfigs', 'devQuestions']) {
        const items = doc.previousAnalysis[key] || [];
        if (items.length > 0) {
          const label = { mismatches: 'Mismatches', unclear: 'Unclear', missingConfigs: 'Missing Configs', devQuestions: 'Dev Questions' }[key];
          parts.push(`## ${label}\n${items.map((i) => `- ${i.content}`).join('\n')}`);
        }
      }
      previousIssues = parts.join('\n\n');
    }

    const analysis = await analyzeDocument(text, previousIssues);

    if (doc?.previousAnalysis) {
      const prev = doc.previousAnalysis;
      for (const key of ['mismatches', 'unclear', 'missingConfigs', 'devQuestions']) {
        const oldItems = prev[key] || [];
        const newItems = analysis[key] || [];
        const newContents = new Set(newItems.map((i) => i.content));
        for (const oldItem of oldItems) {
          if (!newContents.has(oldItem.content)) {
            newItems.push({ content: oldItem.content, isResolved: true });
          }
        }
      }
    }

    await Document.findByIdAndUpdate(docId, {
      extractedText: text,
      chunks,
      analysis,
      status: 'analyzed',
    });
  } catch (err) {
    console.error('Analysis error:', err);
    await Document.findByIdAndUpdate(docId, {
      status: 'error',
      extractedText: err.message,
    });
  }
}

router.post('/link', async (req, res) => {
  try {
    const { url, projectId } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'Google Docs URL is required' });
    }
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const team = await getUserTeam(req.user.uid);
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const { text, docId, title } = await fetchGoogleDocText(url.trim());

    const doc = await Document.create({
      teamId: team._id,
      projectId,
      name: title || `Google Doc (${docId.slice(0, 12)}...)`,
      sourceType: 'gdocs',
      sourceUrl: url.trim(),
      extractedText: '',
      uploadedBy: req.user.uid,
      status: 'uploaded',
    });

    runAnalysis(doc._id, text);

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reanalyze', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const doc = await Document.findOne({ _id: req.params.id, teamId: team._id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!doc.sourceUrl) {
      return res.status(400).json({ error: 'This document has no source URL to re-fetch' });
    }

    const { text } = await fetchGoogleDocText(doc.sourceUrl);

    doc.previousAnalysis = doc.analysis;
    doc.analysis = undefined;
    doc.status = 'uploaded';
    await doc.save();

    runAnalysis(doc._id, text);

    res.json({ message: 'Re-analysis started', doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const team = await getUserTeam(req.user.uid);
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const docs = await Document.find({ teamId: team._id, projectId })
      .select('-extractedText -chunks')
      .sort({ createdAt: -1 });

    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const doc = await Document.findOne({ _id: req.params.id, teamId: team._id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const team = await getUserTeam(req.user.uid);
    if (!team) {
      return res.status(404).json({ error: 'You are not in a team' });
    }

    const doc = await Document.findOneAndDelete({ _id: req.params.id, teamId: team._id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({ message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
