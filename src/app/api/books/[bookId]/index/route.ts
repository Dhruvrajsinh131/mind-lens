import { NextRequest, NextResponse } from "next/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveUrlLoader } from "@langchain/community/document_loaders/web/recursive_url";
import { compile } from "html-to-text";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { Document } from "@langchain/core/documents";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";

import connectDB from "@/lib/mongodb";
import Book from "@/models/Book";
import Attachment from "@/models/Attachment";
import { verifyToken } from "@/lib/auth";
import mongoose from "mongoose";
import { unlink } from "fs";

interface IndexRequest {
  attachmentId: string;
  sourceType: "pdf" | "website" | "youtube";
  sourceUrl?: string;
  filePath?: string;
}

export async function POST(
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
    const { attachmentId, sourceType, sourceUrl, filePath }: IndexRequest =
      await request.json();

    // Validate bookId
    if (!mongoose.Types.ObjectId.isValid(bookId)) {
      return NextResponse.json({ error: "Invalid book ID" }, { status: 400 });
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

    // Verify attachment ownership and belongs to book
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

    console.log(
      `Processing ${sourceType} source for user ${decoded.userId}, book ${bookId}, attachment ${attachmentId}...`
    );

    let docs: Document[] = [];
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });

    switch (sourceType) {
      case "pdf":
        if (!filePath) {
          return NextResponse.json(
            { error: "File path is required for PDF processing" },
            { status: 400 }
          );
        }
        console.log(`Loading PDF from: ${filePath}`);
        const pdfLoader = new PDFLoader(filePath);
        docs = await pdfLoader.load();
        console.log(`Loaded ${docs.length} pages from PDF`);
        break;

      case "website":
        if (!sourceUrl) {
          return NextResponse.json(
            { error: "Source URL is required for website processing" },
            { status: 400 }
          );
        }
        console.log(`Loading website from: ${sourceUrl}`);

        const compiledConvert = compile({ wordwrap: 130 });

        if (sourceUrl.includes("https://github.com")) {
          console.log("Loading github repo...");

          const githubLoader = new GithubRepoLoader(sourceUrl, {
            branch: "main",
            recursive: false,
            unknown: "warn",
            ignorePaths: ["*.md"],
          });

          docs = await githubLoader.load();
        } else {
          const urlLoader = new RecursiveUrlLoader(sourceUrl, {
            extractor: compiledConvert,
            maxDepth: 2, // Reduced depth for performance
            excludeDirs: ["node_modules", ".git"],
            timeout: 30000, // 30 second timeout
          });
          docs = await urlLoader.load();
        }

        console.log(`Loaded ${docs.length} pages from website`);

        // Create text splitter for website content
        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: 1000,
          chunkOverlap: 200,
          separators: ["\n\n", "\n", " ", ""],
        });

        console.log("Splitting website content into chunks...");
        docs = await textSplitter.splitDocuments(docs);
        console.log(`Created ${docs.length} chunks from website content`);
        break;

      case "youtube":
        if (!sourceUrl) {
          return NextResponse.json(
            { error: "YouTube URL is required for video processing" },
            { status: 400 }
          );
        }
        console.log(`Loading YouTube video from: ${sourceUrl}`);

        try {
          const ytLoader = YoutubeLoader.createFromUrl(sourceUrl, {
            language: "en",
            addVideoInfo: true,
          });

          docs = await ytLoader.load();
          console.log(
            `Loaded transcript from YouTube video (${docs.length} documents)`
          );

          if (docs.length > 0) {
            const ytTextSplitter = new RecursiveCharacterTextSplitter({
              chunkSize: 1000,
              chunkOverlap: 200,
              separators: ["\n\n", "\n", ". ", " ", ""],
            });

            console.log("Splitting YouTube transcript into chunks...");
            docs = await ytTextSplitter.splitDocuments(docs);
            console.log(
              `Created ${docs.length} chunks from YouTube transcript`
            );
          }
        } catch (error) {
          console.error("YouTube processing error:", error);
          return NextResponse.json(
            {
              error: `YouTube processing failed: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
            },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unsupported source type: ${sourceType}` },
          { status: 400 }
        );
    }

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "No content found to index" },
        { status: 400 }
      );
    }

    // Add book and user context to document metadata
    docs = docs.map((doc, index) => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        userId: decoded.userId,
        bookId: bookId,
        attachmentId: attachmentId,
        sourceType: sourceType,
        source: sourceUrl || filePath,
        chunkIndex: index,
        bookTitle: book.title,
        attachmentName: attachment.name,
      },
    }));

    if (filePath)
      unlink(filePath, (err) => {
        if (err) {
          console.error("An error occurred deleting file:", err);
        } else {
          console.log("File deleted successfully");
        }
      });

    console.log("Creating embeddings and storing in vector database...");

    // Use a collection name that includes user context for better isolation
    const collectionName = `mindlens-${decoded.userId}`;

    await QdrantVectorStore.fromDocuments(docs, embeddings, {
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: collectionName,
      apiKey: process.env.QDRANT_API_KEY,
    });

    // Update attachment status to completed
    await Attachment.findByIdAndUpdate(attachmentId, {
      status: "completed",
      "metadata.wordCount": docs.reduce(
        (total, doc) => total + (doc.pageContent?.length || 0),
        0
      ),
      "metadata.extractedText": docs
        .map((doc) => doc.pageContent)
        .join("\n")
        .substring(0, 1000), // Store first 1000 chars as preview
      processingCompletedAt: new Date(),
    });

    console.log(
      `Successfully indexed ${docs.length} documents/chunks for user ${decoded.userId}, book ${bookId}`
    );

    return NextResponse.json({
      status: "Indexing Done",
      documentsProcessed: docs.length,
      sourceType: sourceType,
      bookId: bookId,
      attachmentId: attachmentId,
      collectionName: collectionName,
    });
  } catch (error: unknown) {
    console.error("Indexing error:", error);

    let message = "Failed to upload file";

    if (error instanceof Error) {
      message = error.message;
    }

    // Update attachment status to failed if we have the attachment ID
    try {
      const { attachmentId } = await request.json();
      if (attachmentId) {
        await Attachment.findByIdAndUpdate(attachmentId, {
          status: "failed",
          "metadata.error": message,
          processingCompletedAt: new Date(),
        });
      }
    } catch (updateError) {
      console.error("Failed to update attachment status:", updateError);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
