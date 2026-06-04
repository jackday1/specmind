import mongoose from 'mongoose';

const analysisItemSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    suggestion: { type: String, default: '' },
    isResolved: { type: Boolean, default: false },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    mismatches: [analysisItemSchema],
    unclear: [analysisItemSchema],
    missingConfigs: [analysisItemSchema],
    devQuestions: [analysisItemSchema],
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    name: { type: String, required: true },
    sourceType: { type: String, enum: ['upload', 'gdocs'], default: 'gdocs' },
    sourceUrl: { type: String },
    firebasePath: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    extractedText: { type: String, default: '' },
    chunks: [{ type: String }],
    analysis: analysisSchema,
    previousAnalysis: analysisSchema,
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'error'],
      default: 'uploaded',
    },
    uploadedBy: { type: String, required: true },
  },
  { timestamps: true }
);

documentSchema.index({ teamId: 1, createdAt: -1 });

export default mongoose.model('Document', documentSchema);
