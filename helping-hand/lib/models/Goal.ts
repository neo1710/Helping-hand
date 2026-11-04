import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { ICustomAvatar } from './User';

export interface ILogEntry {
  _id?: Types.ObjectId;
  userId?: string;
  username?: string;
  amount: number;
  note: string;
  date: Date;
}

export interface ICheckpointReward {
  checkpointIndex: number; // 1-indexed (1 ... checkpoints)
  milestoneValue: number;
  reward: string;
}

export interface IGoalMember {
  _id?: Types.ObjectId;
  user: Types.ObjectId;     // Reference to User model
  auth0Id: string;
  role: 'creator' | 'member';
  status: 'active' | 'pending_approval' | 'invited';
  joinedAt: Date;
  progress: number;
  avatarIndex?: number;
  avatarTone?: string;
  avatarSkin?: string;
  avatarHair?: string;
  avatarHairColor?: string;
  customAvatar?: ICustomAvatar;
  log: ILogEntry[];
}

export type GoalType = 'personal' | 'collaborative' | 'competitive' | 'open';
export type GoalAccess = 'public' | 'invite_only';

export interface IGoal extends Document {
  creator?: Types.ObjectId;    // Reference to User model
  creatorUserId: string;       // Auth0 sub / id
  userId?: string;             // legacy field for backwards compatibility
  name: string;
  description?: string;
  goalType: GoalType;
  accessType?: GoalAccess;
  target: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  checkpoints: number;         // 4 to 20 checkpoints
  rewards: ICheckpointReward[];
  avatarIndex: number;
  avatarTone: string;
  avatarSkin: string;
  avatarHair: string;
  avatarHairColor: string;
  customAvatar?: ICustomAvatar;
  progress: number;            // For personal/collaborative total progress
  log: ILogEntry[];
  members: IGoalMember[];
  status: 'active' | 'completed' | 'abandoned';
  createdAt: Date;
  updatedAt: Date;
}

const LogEntrySchema = new Schema<ILogEntry>(
  {
    userId: { type: String },
    username: { type: String },
    amount: { type: Number, required: true },
    note: { type: String, default: '' },
    date: { type: Date, default: Date.now },
  },
  { _id: true }
);

const CheckpointRewardSchema = new Schema<ICheckpointReward>(
  {
    checkpointIndex: { type: Number, required: true },
    milestoneValue: { type: Number, required: true },
    reward: { type: String, required: true, trim: true, default: 'Celebration milestone' },
  },
  { _id: false }
);

const CustomAvatarSchema = new Schema(
  {
    name: { type: String, default: 'My Hero' },
    tone: { type: String, default: '#3b82f6' },
    skin: { type: String, default: '#f0c4a0' },
    hairStyle: { type: String, default: 'short' },
    hairColor: { type: String, default: '#2b2118' },
    eyesColor: { type: String, default: '#1a1a2e' },
    clothingStyle: { type: String, default: 'hoodie' },
    accessory: { type: String, default: 'none' },
    expression: { type: String, default: 'happy' },
  },
  { _id: false }
);

const GoalMemberSchema = new Schema<IGoalMember>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    auth0Id: { type: String, required: true },
    role: { type: String, enum: ['creator', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'pending_approval', 'invited'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0, min: 0 },
    avatarIndex: { type: Number, default: 0 },
    avatarTone: { type: String, default: '#3b82f6' },
    avatarSkin: { type: String, default: '#f0c4a0' },
    avatarHair: { type: String, default: 'short' },
    avatarHairColor: { type: String, default: '#2b2118' },
    customAvatar: { type: CustomAvatarSchema },
    log: { type: [LogEntrySchema], default: [] },
  },
  { _id: true }
);

const GoalSchema = new Schema<IGoal>(
  {
    creator: { type: Schema.Types.ObjectId, ref: 'User' },
    creatorUserId: { type: String, index: true },
    userId: { type: String, index: true }, // Backwards compatibility
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 500 },
    goalType: {
      type: String,
      enum: ['personal', 'collaborative', 'competitive', 'open'],
      default: 'personal',
      index: true,
    },
    accessType: {
      type: String,
      enum: ['public', 'invite_only'],
      default: 'public',
      index: true,
    },
    target: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, default: 'km' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    checkpoints: { type: Number, min: 2, max: 20, default: 4 },
    rewards: { type: [CheckpointRewardSchema], default: [] },
    avatarIndex: { type: Number, default: 0 },
    avatarTone: { type: String, default: '#3b82f6' },
    avatarSkin: { type: String, default: '#f0c4a0' },
    avatarHair: { type: String, default: 'short' },
    avatarHairColor: { type: String, default: '#2b2118' },
    customAvatar: { type: CustomAvatarSchema },
    progress: { type: Number, default: 0, min: 0 },
    log: { type: [LogEntrySchema], default: [] },
    members: { type: [GoalMemberSchema], default: [] },
    status: { type: String, enum: ['active', 'completed', 'abandoned'], default: 'active' },
  },
  { timestamps: true }
);

GoalSchema.index({ creatorUserId: 1, createdAt: -1 });
GoalSchema.index({ 'members.auth0Id': 1 });
GoalSchema.index({ goalType: 1, status: 1 });

const Goal: Model<IGoal> = mongoose.models.Goal ?? mongoose.model<IGoal>('Goal', GoalSchema);
export default Goal;
