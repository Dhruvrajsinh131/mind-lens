"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Database, Trash2, BookOpen, Edit2 } from "lucide-react";
import SourceInput from "../source-input/source-input";
import SourceList from "../source-list/source-list";
import ChatInterface from "../chat-interface/chat-interface";
import { SourceItem } from "@/lib/source-types";
import { useBook, type Attachment } from "@/contexts/BookContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

type Props = {
  bookId: string;
};

const Main = ({ bookId }: Props) => {
  const {
    book,
    attachments,
    loading,
    error,
    loadBook,
    addAttachment,
    removeAttachment,
    updateAttachment,
  } = useBook();
  const { user } = useAuth();
  const router = useRouter();

  // Convert attachments to SourceItem format for compatibility
  const sources: SourceItem[] = attachments.map((attachment: Attachment) => ({
    id: attachment.id,
    type: attachment.type,
    name: attachment.name,
    content: attachment.metadata?.extractedText || "",
    url: attachment.url || attachment.filePath || "",
    status:
      attachment.status === "failed"
        ? "error"
        : (attachment.status as "processing" | "completed" | "error"),
    title: attachment.metadata?.title,
    description: attachment.metadata?.description,
    thumbnail: attachment.metadata?.thumbnail,
    error: attachment.metadata?.error,
    addedAt: new Date(attachment.createdAt),
  }));

  // Load book data when component mounts or bookId changes
  useEffect(() => {
    if (bookId) {
      loadBook(bookId);
    }
  }, [bookId, loadBook]);

  const handleSourceAdd = async (source: Attachment) => {
    handleSourceUpdate(source.id, { status: "processing" });
  };

  const handleSourceUpdate = async (
    sourceId: string,
    updates: Partial<SourceItem>
  ) => {
    const updateData: any = {};

    if (updates.status) {
      updateData.status =
        updates.status === "error" ? "failed" : updates.status;
    }

    if (updates.title || updates.description || updates.error) {
      updateData.metadata = {
        ...(updates.title && { title: updates.title }),
        ...(updates.description && { description: updates.description }),
        ...(updates.error && { error: updates.error }),
      };
    }

    const result = await updateAttachment(sourceId, updateData);
    if (!result.success) {
      console.error("Failed to update attachment:", result.error);
    }
  };

  const handleSourceRemove = async (sourceId: string) => {
    const result = await removeAttachment(sourceId);
    if (!result.success) {
      console.error("Failed to remove attachment:", result.error);
    }
  };

  const handleClearAllSources = async () => {
    // Remove all attachments
    for (const attachment of attachments) {
      await removeAttachment(attachment.id);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading book...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <BookOpen className="h-16 w-16 mx-auto mb-4" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Failed to Load Book</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => router.push("/books")}>Back to Books</Button>
        </div>
      </div>
    );
  }

  // Show book not found state
  if (!book) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Book not found</h3>
          <p className="text-muted-foreground mb-4">
            The book you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Button onClick={() => router.push("/books")}>Back to Books</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex gap-6 p-6">
      <Card className="w-[35%] flex flex-col max-h-full">
        <CardHeader className="border-b border-border/50 pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Sources</CardTitle>
            </div>
            {sources.length > 0 && (
              <Button
                onClick={handleClearAllSources}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Add websites, YouTube videos, or files to analyze
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            <SourceInput
              type="website"
              title="Website Links"
              onSourceAdd={handleSourceAdd}
              onSourceUpdate={handleSourceUpdate}
            />

            <SourceInput
              type="youtube"
              title="YouTube Videos"
              onSourceAdd={handleSourceAdd}
              onSourceUpdate={handleSourceUpdate}
            />

            <SourceInput
              type="file"
              title="Upload Files"
              onSourceAdd={handleSourceAdd}
              onSourceUpdate={handleSourceUpdate}
            />

            {sources.length > 0 && (
              <div className="border-t border-border/50 pt-6">
                <SourceList
                  sources={sources}
                  onSourceRemove={handleSourceRemove}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="w-[65%] flex flex-col max-h-full">
        <CardHeader className="border-b border-border/50 pb-4 shrink-0">
          <CardTitle className="text-xl">Chat</CardTitle>
          <p className="text-sm text-muted-foreground">
            Ask questions about your sources
          </p>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
          <ChatInterface sources={sources} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Main;
