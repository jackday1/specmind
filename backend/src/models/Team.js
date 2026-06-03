import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, index: true },
    ownerEmail: { type: String, lowercase: true, trim: true },
    invitedEmails: [{ type: String, lowercase: true, trim: true }],
    plan: { type: String, enum: ['free', 'standard', 'pro', 'business'], default: 'free' },
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

teamSchema.index({ invitedEmails: 1 });

export default mongoose.model('Team', teamSchema);
