import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomAvatar {
  name: string;
  tone: string;
  skin: string;
  hairStyle: string;
  hairColor: string;
  eyesColor?: string;
  clothingStyle?: string;
  accessory?: string;
  expression?: string;
}

export interface IUser extends Document {
  auth0Id: string;
  username: string;
  name: string;
  email: string;
  picture: string;
  bio: string;
  customAvatar?: ICustomAvatar;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    picture: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: 280,
    },
    customAvatar: {
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
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
export default User;

