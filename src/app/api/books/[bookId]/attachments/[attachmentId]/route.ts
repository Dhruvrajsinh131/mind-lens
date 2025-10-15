import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Book from "@/models/Book";
import Attachment from "@/models/Attachment";
import { verifyToken } from "@/lib/auth";
import mongoose from "mongoose";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, mongoose.Error.ValidatorError>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; attachmentId: string }> }
) {
  try {
    // Get token from cookie
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { bookId, attachmentId } = await params;

    // Validate IDs
    if (
      !mongoose.Types.ObjectId.isValid(bookId) ||
      !mongoose.Types.ObjectId.isValid(attachmentId)
    ) {
      return NextResponse.json(
        { error: "Invalid book ID or attachment ID" },
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

    // Get attachment
    const attachment = await Attachment.findOne({
      _id: attachmentId,
      bookId: bookId,
      userId: decoded.userId,
    });

    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        attachment: {
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
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get attachment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; attachmentId: string }> }
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

    const { bookId, attachmentId } = await params;
    const { name, metadata, status } = await request.json();

    if (
      !mongoose.Types.ObjectId.isValid(bookId) ||
      !mongoose.Types.ObjectId.isValid(attachmentId)
    ) {
      return NextResponse.json(
        { error: "Invalid book ID or attachment ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedAttachment = await Attachment.findOneAndUpdate(
      {
        _id: attachmentId,
        bookId: bookId,
        userId: decoded.userId,
      },
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(metadata !== undefined && { metadata: { ...metadata } }),
        ...(status !== undefined && { status }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedAttachment) {
      return NextResponse.json(
        { error: "Attachment not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Attachment updated successfully",
        attachment: {
          id: updatedAttachment._id,
          type: updatedAttachment.type,
          name: updatedAttachment.name,
          url: updatedAttachment.url,
          filePath: updatedAttachment.filePath,
          originalFileName: updatedAttachment.originalFileName,
          fileSize: updatedAttachment.fileSize,
          mimeType: updatedAttachment.mimeType,
          status: updatedAttachment.status,
          metadata: updatedAttachment.metadata,
          processingStartedAt: updatedAttachment.processingStartedAt,
          processingCompletedAt: updatedAttachment.processingCompletedAt,
          createdAt: updatedAttachment.createdAt,
          updatedAt: updatedAttachment.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update attachment error:", error);

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string; attachmentId: string }> }
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

    const { bookId, attachmentId } = await params;

    if (
      !mongoose.Types.ObjectId.isValid(bookId) ||
      !mongoose.Types.ObjectId.isValid(attachmentId)
    ) {
      return NextResponse.json(
        { error: "Invalid book ID or attachment ID" },
        { status: 400 }
      );
    }

    await connectDB();

    const deletedAttachment = await Attachment.findOneAndDelete({
      _id: attachmentId,
      bookId: bookId,
      userId: decoded.userId,
    });

    if (!deletedAttachment) {
      return NextResponse.json(
        { error: "Attachment not found or access denied" },
        { status: 404 }
      );
    }

    try {
      const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-small",
      });

      const collectionName = `mindlens-${decoded.userId}`;

      await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: process.env.QDRANT_URL || "http://localhost:6333",
        collectionName: collectionName,
        apiKey: process.env.QDRANT_API_KEY,
      });
    } catch (vectorError) {
      console.error("Error removing from vector database:", vectorError);
    }

    return NextResponse.json(
      {
        message: "Attachment deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete attachment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
