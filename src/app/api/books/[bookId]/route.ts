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
        book: {
          id: book._id,
          title: book.title,
          description: book.description,
          coverImage: book.coverImage,
          isPrivate: book.isPrivate,
          createdAt: book.createdAt,
          updatedAt: book.updatedAt,
        },
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
    console.error("Get book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const { title, description, coverImage, isPrivate } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    if (title !== undefined) {
      if (!title || typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json(
          { error: "Book title cannot be empty" },
          { status: 400 }
        );
      }

      if (title.length > 100) {
        return NextResponse.json(
          { error: "Book title cannot exceed 100 characters" },
          { status: 400 }
        );
      }
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedBook = await Book.findOneAndUpdate(
      { _id: bookId, userId: decoded.userId },
      {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || "",
        }),
        ...(coverImage !== undefined && { coverImage }),
        ...(isPrivate !== undefined && { isPrivate }),
      },
      { new: true, runValidators: true }
    );

    if (!updatedBook) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Book updated successfully",
        book: {
          id: updatedBook._id,
          title: updatedBook.title,
          description: updatedBook.description,
          coverImage: updatedBook.coverImage,
          isPrivate: updatedBook.isPrivate,
          createdAt: updatedBook.createdAt,
          updatedAt: updatedBook.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Update book error:", error);

    const err = error as MongoServerError;

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

// DELETE /api/books/[bookId] - Delete a specific book
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
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

    const { bookId } = await params;

    // Validate bookId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
    }

    // Connect to database
    await connectDB();

    // Find and delete book (verify ownership)
    const deletedBook = await Book.findOneAndDelete({
      _id: bookId,
      userId: decoded.userId,
    });

    if (!deletedBook) {
      return NextResponse.json(
        { error: "Book not found or access denied" },
        { status: 404 }
      );
    }

    // Delete all attachments for this book
    await Attachment.deleteMany({
      bookId: bookId,
      userId: decoded.userId,
    });

    return NextResponse.json(
      {
        message: "Book and all attachments deleted successfully",
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete book error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
