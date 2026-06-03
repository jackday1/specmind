import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    maxMembers: { type: Number, required: true },
    maxDocuments: { type: Number, required: true },
    maxMessages: { type: Number, required: true },
    price: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: false }
);

export default mongoose.model('Plan', planSchema);
