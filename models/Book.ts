import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBook extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  color: string;
  dateAdded: Date;
  isDemo?: boolean;
}

const BookSchema = new Schema<IBook>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      default: '#1E6F6C',
    },
    dateAdded: {
      type: Date,
      default: Date.now,
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

BookSchema.index({ userId: 1, code: 1 }, { unique: true });
BookSchema.index({ userId: 1, name: 1 });

const Book: Model<IBook> =
  mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);

export default Book;
