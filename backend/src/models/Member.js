import mongoose from 'mongoose';

const memberSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    uid: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    photoURL: { type: String, default: null },
    role: { type: String, enum: ['owner', 'member'], default: 'member' },
  },
  { timestamps: true }
);

memberSchema.index({ teamId: 1, uid: 1 }, { unique: true });
memberSchema.index({ uid: 1 });
memberSchema.index({ email: 1 });

export default mongoose.model('Member', memberSchema);
