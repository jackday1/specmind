import { Router } from 'express';
import Plan from '../models/Plan.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const plans = await Plan.find().sort({ sortOrder: 1 }).lean();
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
