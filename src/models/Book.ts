import mongoose, { Document, Schema } from "mongoose";

export interface IBook extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  coverImage?: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Book title is required"],
      trim: true,
      minlength: [1, "Book title cannot be empty"],
      maxlength: [100, "Book title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    coverImage: {
      type: String,
      default: null,
    },
    isPrivate: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for better query performance
BookSchema.index({ userId: 1, createdAt: -1 });
BookSchema.index({ userId: 1, title: 1 });

BookSchema.virtual("attachmentCount", {
  ref: "Attachment",
  localField: "_id",
  foreignField: "bookId",
  count: true,
});

const Book = mongoose.models.Book || mongoose.model<IBook>("Book", BookSchema);

export default Book;
