import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Book from "@/models/Book";
import Attachment from "@/models/Attachment";
import { verifyToken } from "@/lib/auth";
import mongoose from "mongoose";

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, mongoose.Error.ValidatorError>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { bookId } = await params;

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    await connectDB();

    const book = await Book.findOne({
      _id: bookId,
      userId: decoded.userId,
    });

    if (!book) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      );
    }

    const attachments = await Attachment.find({
      bookId: bookId,
      userId: decoded.userId,
    }).sort({ createdAt: -1 });

    return NextResponse.json(
      {
        attachments: attachments.map((attachment) => ({
          id: attachment._id,
          type: attachment.type,
          name: attachment.name,
          url: attachment.url,
          filePath: attachment.filePath,
          originalFileName: attachment.originalFileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          status: attachment.status,
          metadata: attachment.metadata,
          processingStartedAt: attachment.processingStartedAt,
          processingCompletedAt: attachment.processingCompletedAt,
          createdAt: attachment.createdAt,
          updatedAt: attachment.updatedAt,
        })),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get attachments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { bookId } = await params;
    const body = await request.json();
    const {
      type,
      name = "url",
      url,
      filePath,
      originalFileName,
      fileSize,
      mimeType,
      metadata,
    } = body;

    console.log("body", body);

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    if (!type || !["website", "youtube", "file"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid attachment type" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Attachment name is required" },
        { status: 400 }
      );
    }

    if (name.length > 200) {
      return NextResponse.json(
        { error: "Attachment name cannot exceed 200 characters" },
        { status: 400 }
      );
    }

    // Type-specific validation
    if ((type === "website" || type === "youtube") && !url) {
      return NextResponse.json(
        { error: "URL is required for website and youtube attachments" },
        { status: 400 }
      );
    }

    if (type === "file" && !filePath) {
      return NextResponse.json(
        { error: "File path is required for file attachments" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Verify book ownership
    const book = await Book.findOne({
      _id: bookId,
      userId: decoded.userId,
    });

    if (!book) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      );
    }

    // Create new attachment
    const newAttachment = await Attachment.create({
      bookId: bookId,
      userId: decoded.userId,
      type,
      name: name.trim(),
      url: url || undefined,
      filePath: filePath || undefined,
      originalFileName: originalFileName || undefined,
      fileSize: fileSize || undefined,
      mimeType: mimeType || undefined,
      status: "processing",
      metadata: metadata || {},
    });

    // Update book's updatedAt timestamp
    await Book.findByIdAndUpdate(bookId, { updatedAt: new Date() });

    return NextResponse.json(
      {
        message: "Attachment created successfully",
        attachment: {
          id: newAttachment._id,
          type: newAttachment.type,
          name: newAttachment.name,
          url: newAttachment.url,
          filePath: newAttachment.filePath,
          originalFileName: newAttachment.originalFileName,
          fileSize: newAttachment.fileSize,
          mimeType: newAttachment.mimeType,
          status: newAttachment.status,
          metadata: newAttachment.metadata,
          processingStartedAt: newAttachment.processingStartedAt,
          processingCompletedAt: newAttachment.processingCompletedAt,
          createdAt: newAttachment.createdAt,
          updatedAt: newAttachment.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create attachment error:", error);

    const err = error as MongoServerError;

    // Handle mongoose validation errors
    if (err instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(err.errors).map(
        (err: { message: string }) => err.message
      );
      return NextResponse.json(
        { error: messages[0] || "Validation error" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
