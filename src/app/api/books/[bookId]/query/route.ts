import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import OpenAI from "openai";
import connectDB from "@/lib/mongodb";
import Book from "@/models/Book";
import { verifyToken } from "@/lib/auth";
import mongoose, { MongooseError } from "mongoose";
import { Document } from "@langchain/core/documents";

const openaiClient = new OpenAI();

interface QueryRequest {
  userQuery: string;
  includeAllBooks?: boolean;
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
    const { userQuery, includeAllBooks = false }: QueryRequest =
      await request.json();

    if (
      !userQuery ||
      typeof userQuery !== "string" ||
      userQuery.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "User query is required" },
        { status: 400 }
      );
    }

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

    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });

    const collectionName = `mindlens-${decoded.userId}`;

    console.log("decoded.userId", decoded.userId);

    let vectorStore;
    try {
      vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: process.env.QDRANT_URL || "http://localhost:6333",
        collectionName: collectionName,
        apiKey: process.env.QDRANT_API_KEY,
      });
    } catch (error) {
      console.error("Vector store connection error:", error);
      return NextResponse.json(
        {
          error:
            "No indexed documents found. Please add and index some sources first.",
        },
        { status: 404 }
      );
    }

    console.log("decoded.userId", decoded.userId);
    console.log("bookId", bookId);

    const retriever = vectorStore.asRetriever({
      k: 6,
      filter: {
        must: [
          { key: "metadata.bookId", match: { value: bookId } },
          { key: "metadata.userId", match: { value: decoded.userId } },
        ],
      },
    });

    console.log(
      `Querying ${includeAllBooks ? "all books" : "specific book"} for user ${
        decoded.userId
      }`
    );
    console.log(`Query: "${userQuery}"`);

    const relevantChunks = await retriever.invoke(userQuery);

    console.log(`Found ${relevantChunks.length} relevant chunks`);
    if (relevantChunks.length > 0) {
      console.log(
        "Chunk sources:",
        relevantChunks.map((chunk) => ({
          source: chunk.metadata?.source || "Unknown source",
          bookTitle: chunk.metadata?.bookTitle || "Unknown book",
          attachmentName:
            chunk.metadata?.attachmentName || "Unknown attachment",
        }))
      );
    }

    if (relevantChunks.length === 0) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        start(controller) {
          const noResultsMessage = includeAllBooks
            ? "I couldn't find any relevant information in your books to answer that question. Try adding more sources or rephrasing your query."
            : `I couldn't find any relevant information in the book "${book.title}" to answer that question. Try adding more sources to this book or rephrasing your query.`;

          const data = `data: ${JSON.stringify({
            content: noResultsMessage,
          })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const chunksByBook = relevantChunks.reduce((acc, chunk) => {
      const bookTitle = chunk.metadata?.bookTitle || "Unknown Book";
      if (!acc[bookTitle]) {
        acc[bookTitle] = [];
      }
      acc[bookTitle].push(chunk);
      return acc;
    }, {} as Record<string, Document[]>);

    const contextSections = Object.entries(chunksByBook)
      .map(([bookTitle, chunks]) => {
        const sources = chunks
          .map(
            (chunk, index) =>
              `Source ${index + 1} (${
                chunk.metadata?.attachmentName || "Unknown"
              }): ${chunk.pageContent}`
          )
          .join("\n\n");

        return `### Book: ${bookTitle}\n${sources}`;
      })
      .join("\n\n");

    const SYSTEM_PROMPT = `
You are an AI assistant helping a user query their personal knowledge base organized in books. 

Here's the relevant context from their ${
      includeAllBooks ? "books" : `book "${book.title}"`
    }:

${contextSections}

Instructions:
- Only answer based on the provided context
- Be specific and cite which book/source you're referencing
- If the context doesn't contain enough information, say so
- Provide comprehensive answers when possible
- Use a helpful and conversational tone
- If referencing multiple books, organize your answer clearly
    `;

    const stream = await openaiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userQuery },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            if (content) {
              const data = `data: ${JSON.stringify({ content })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: unknown) {
    console.error("Query error:", JSON.stringify(error));
    const err = error as MongooseError;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
