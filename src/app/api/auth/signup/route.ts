import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { hashPassword, generateToken, extractUserForToken } from "@/lib/auth";
import mongoose from "mongoose";

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
  errors?: Record<string, mongoose.Error.ValidatorError>;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
    });

    const tokenPayload = extractUserForToken(newUser);
    const token = generateToken(tokenPayload);

    const userData = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt,
    };

    const response = NextResponse.json(
      {
        message: "User created successfully",
        user: userData,
        token,
      },
      { status: 201 }
    );

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // must be true on prod HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // if frontend/backend separated
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: unknown) {
    console.error("Signup error:", error);

    const err = error as MongoServerError;

    if (err.code === 11000) {
      const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
      return NextResponse.json(
        { error: `${field} already exists` },
        { status: 409 }
      );
    }

    if (err instanceof mongoose.Error.ValidationError) {
      const messages = Object.values(err.errors).map((e) => e.message);
      return NextResponse.json(
        { error: messages[0] ?? "Validation error" },
        { status: 400 }
      );
    }

    if (err instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        { error: `Invalid ${err.path}: ${err.value}` },
        { status: 400 }
      );
    }

    const fallbackMessage =
      err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}
