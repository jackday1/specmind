import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    name: { type: String, required: true, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

projectSchema.index({ teamId: 1, createdAt: -1 });

export default mongoose.model('Project', projectSchema);
