import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILogEntry {
  amount: number;
  note: string;
  date: Date;
}

export interface IGoal extends Document {
  userId: string;          // Auth0 sub (e.g. "auth0|abc123")
  name: string;
  target: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  checkpoints: number;
  avatarIndex: number;
  avatarTone: string;
  avatarSkin: string;
  avatarHair: 'short' | 'long' | 'bun' | 'curly';
  avatarHairColor: string;
  progress: number;
  log: ILogEntry[];
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
}

const LogEntrySchema = new Schema<ILogEntry>({
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  date: { type: Date, default: Date.now },
});

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: String, default: 'demo-user-local', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    target: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, default: 'km' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    checkpoints: { type: Number, enum: [2, 3, 4], default: 3 },
    avatarIndex: { type: Number, min: 0, max: 5, default: 0 },
    avatarTone: { type: String, default: '#3b82f6' },
    avatarSkin: { type: String, default: '#f0c4a0' },
    avatarHair: { type: String, enum: ['short', 'long', 'bun', 'curly'], default: 'short' },
    avatarHairColor: { type: String, default: '#2b2118' },
    progress: { type: Number, default: 0, min: 0 },
    log: { type: [LogEntrySchema], default: [] },
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  },
  { timestamps: true }
);

// Compound index: each user's goals sorted by creation
GoalSchema.index({ userId: 1, createdAt: -1 });

const Goal: Model<IGoal> = mongoose.models.Goal ?? mongoose.model<IGoal>('Goal', GoalSchema);
export default Goal;
