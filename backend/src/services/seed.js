import Plan from '../models/Plan.js';

const SEED_PLANS = [
  { key: 'free',     label: 'Free',     maxMembers: 3,   maxDocuments: 10,  maxMessages: 20,  price: 0,  sortOrder: 0 },
  { key: 'standard', label: 'Standard', maxMembers: 5,   maxDocuments: 50,  maxMessages: 100, price: 8,  sortOrder: 1 },
  { key: 'pro',      label: 'Pro',      maxMembers: 20,  maxDocuments: 200, maxMessages: 200, price: 20, sortOrder: 2 },
  { key: 'business', label: 'Business', maxMembers: 50,  maxDocuments: 500, maxMessages: 500, price: 50, sortOrder: 3 },
];

export async function seedPlans() {
  for (const plan of SEED_PLANS) {
    await Plan.findOneAndUpdate(
      { key: plan.key },
      { $set: plan },
      { upsert: true, new: true }
    );
  }
  console.log('Plans seeded');
}
