import Plan from '../models/Plan.js';

let planCache = null;

const FALLBACK_PLAN = {
  key: 'free',
  label: 'Free',
  maxMembers: 3,
  maxDocuments: 10,
  maxMessages: 20,
  price: 0,
};

export async function loadPlans() {
  planCache = { free: FALLBACK_PLAN };
  const plans = await Plan.find().sort({ sortOrder: 1 }).lean();
  for (const p of plans) {
    planCache[p.key] = p;
  }
  return planCache;
}

export async function getPlanConfig(team) {
  if (!planCache) await loadPlans();
  return planCache[team.plan] || planCache.free || FALLBACK_PLAN;
}

export function checkMemberLimit(team, currentMemberCount) {
  const plan =
    (planCache && planCache[team.plan]) || planCache?.free || FALLBACK_PLAN;
  const current = currentMemberCount + (team.invitedEmails || []).length;
  if (current >= plan.maxMembers) {
    return `Your ${plan.label} plan allows up to ${plan.maxMembers} members. Upgrade to add more.`;
  }
  return null;
}

export function checkAcceptLimit(team, currentMemberCount) {
  const plan =
    (planCache && planCache[team.plan]) || planCache?.free || FALLBACK_PLAN;
  if (currentMemberCount >= plan.maxMembers) {
    return `This team is full (${plan.maxMembers} member limit on the ${plan.label} plan).`;
  }
  return null;
}

export async function checkDocumentLimit(team, Document) {
  const plan =
    (planCache && planCache[team.plan]) || planCache?.free || FALLBACK_PLAN;
  const count = await Document.countDocuments({ teamId: team._id });
  if (count >= plan.maxDocuments) {
    return `Your ${plan.label} plan allows up to ${plan.maxDocuments} documents. Upgrade to add more.`;
  }
  return null;
}

export function checkMessageLimit(team) {
  const plan =
    (planCache && planCache[team.plan]) || planCache?.free || FALLBACK_PLAN;
  if ((team.messageCount || 0) >= plan.maxMessages) {
    return `Your ${plan.label} plan allows up to ${plan.maxMessages} messages. Upgrade to send more.`;
  }
  return null;
}
