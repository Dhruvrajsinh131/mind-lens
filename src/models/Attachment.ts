import mongoose, { Document, Schema } from "mongoose";

export interface IAttachment extends Document {
  bookId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "website" | "youtube" | "file" | "text";
  name: string;
  url?: string;
  filePath?: string;
  originalFileName?: string;
  fileSize?: number;
  mimeType?: string;
  status: "processing" | "completed" | "failed";
  metadata: {
    title?: string;
    description?: string;
    thumbnail?: string;
    duration?: number;
    wordCount?: number;
    language?: string;
    extractedText?: string;
    z?: string;
  };
  processingStartedAt?: Date;
  processingCompletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema: Schema = new Schema(
  {
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "Book ID is required"],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["website", "youtube", "file"],
      required: [true, "Attachment type is required"],
    },
    name: {
      type: String,
      required: [true, "Attachment name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },
    url: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: IAttachment, value: string) {
          // URL is required for website and youtube types
          if ((this.type === "website" || this.type === "youtube") && !value) {
            return false;
          }
          return true;
        },
        message: "URL is required for website and youtube attachments",
      },
    },
    filePath: {
      type: String,
      trim: true,
      validate: {
        validator: function (this: IAttachment, value: string) {
          if (this.type === "file" && !value) {
            return false;
          }
          return true;
        },
        message: "File path is required for file attachments",
      },
    },
    originalFileName: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: 0,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    metadata: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
      thumbnail: { type: String, trim: true },
      duration: { type: Number, min: 0 },
      wordCount: { type: Number, min: 0 },
      language: { type: String, trim: true },
      extractedText: { type: String },
      error: { type: String, trim: true },
    },
    processingStartedAt: {
      type: Date,
    },
    processingCompletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound indexes for better query performance
AttachmentSchema.index({ bookId: 1, createdAt: -1 });
AttachmentSchema.index({ userId: 1, bookId: 1 });
AttachmentSchema.index({ status: 1, createdAt: 1 });

// Pre-save hook to set processing started time
AttachmentSchema.pre("save", function (this: IAttachment, next) {
  if (this.isNew && this.status === "processing") {
    this.processingStartedAt = new Date();
  }

  if (
    this.isModified("status") &&
    (this.status === "completed" || this.status === "failed")
  ) {
    this.processingCompletedAt = new Date();
  }

  next();
});

const Attachment =
  mongoose.models.Attachment ||
  mongoose.model<IAttachment>("Attachment", AttachmentSchema);

export default Attachment;
