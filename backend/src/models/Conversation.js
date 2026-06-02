import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, default: 'New conversation' },
    messages: [messageSchema],
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, teamId: 1, updatedAt: -1 });

export default mongoose.model('Conversation', conversationSchema);
