import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Book from "@/models/Book";
import "@/models/Attachment";
import { verifyToken } from "@/lib/auth";
import mongoose from "mongoose";

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, mongoose.Error.ValidatorError>;
}

export async function GET(request: NextRequest) {
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

    await connectDB();

    const books = await Book.find({ userId: decoded.userId })
      .populate("attachmentCount")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(
      {
        books,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Get books error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const { title, description, coverImage, isPrivate } = await request.json();

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Book title is required" },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { error: "Book title cannot exceed 100 characters" },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description cannot exceed 500 characters" },
        { status: 400 }
      );
    }

    await connectDB();

    const newBook = await Book.create({
      userId: decoded.userId,
      title: title.trim(),
      description: description?.trim() || "",
      coverImage: coverImage || null,
      isPrivate: isPrivate !== undefined ? isPrivate : true,
    });

    return NextResponse.json(
      {
        message: "Book created successfully",
        book: {
          id: newBook._id,
          title: newBook.title,
          description: newBook.description,
          coverImage: newBook.coverImage,
          isPrivate: newBook.isPrivate,
          createdAt: newBook.createdAt,
          updatedAt: newBook.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create book error:", error);

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
