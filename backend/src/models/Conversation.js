import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, default: 'New conversation' },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, teamId: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
