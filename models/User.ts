import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  businessName: string;
  name?: string;
  role: 'admin' | 'worker';
  adminId?: mongoose.Types.ObjectId; // References the Admin owner if user is a worker
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
      default: 'Umar Usman Interior',
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'worker'],
      default: 'admin',
      required: true,
    },
    adminId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
