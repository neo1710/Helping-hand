import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  auth0Id: string;
  username: string;
  name: string;
  email: string;
  picture: string;
  bio: string;
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
  },
  { timestamps: true }
);

const User: Model<IUser> = mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
export default User;

