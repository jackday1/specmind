import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, index: true },
    ownerEmail: { type: String, lowercase: true, trim: true },
    memberIds: [{ type: String }],
    memberEmails: [{ type: String, lowercase: true, trim: true }],
    invitedEmails: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true }
);

teamSchema.index({ memberIds: 1 });
teamSchema.index({ invitedEmails: 1 });

export default mongoose.model('Team', teamSchema);
