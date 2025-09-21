"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";

export interface Attachment {
  id: string;
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
    error?: string;
  };
  processingStartedAt?: string;
  processingCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BookContextType {
  book: Book | null;
  attachments: Attachment[];
  loading: boolean;
  error: string | null;
  loadBook: (bookId: string) => Promise<void>;
  addAttachment: (attachmentData: {
    type: "website" | "youtube" | "file" | "text";
    name: string;
    url?: string;
    filePath?: string;
    originalFileName?: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: any;
  }) => Promise<{ success: boolean; attachment?: Attachment; error?: string }>;
  removeAttachment: (
    attachmentId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateAttachment: (
    attachmentId: string,
    updates: {
      name?: string;
      metadata?: any;
      status?: "processing" | "completed" | "failed";
    }
  ) => Promise<{ success: boolean; error?: string }>;
  updateBook: (
    updates: Partial<Book>
  ) => Promise<{ success: boolean; error?: string }>;
  refreshAttachments: () => Promise<void>;
}

const BookContext = createContext<BookContextType | undefined>(undefined);

export function BookProvider({ children }: { children: React.ReactNode }) {
  const [book, setBook] = useState<Book | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const loadBook = useCallback(
    async (bookId: string) => {
      if (!user) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/books/${bookId}`, {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setBook(data.book);
          setAttachments(data.attachments || []);
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Failed to load book");
          setBook(null);
          setAttachments([]);
        }
      } catch (error) {
        console.error("Error loading book:", error);
        setError("Failed to load book");
        setBook(null);
        setAttachments([]);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const addAttachment = async (attachmentData: {
    type: "website" | "youtube" | "file" | "text";
    name: string;
    url?: string;
    filePath?: string;
    originalFileName?: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: any;
  }) => {
    if (!book) {
      return { success: false, error: "No book selected" };
    }

    try {
      const response = await fetch(`/api/books/${book.id}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(attachmentData),
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments((prev) => [data.attachment, ...prev]);
        return { success: true, attachment: data.attachment };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to add attachment",
        };
      }
    } catch (error) {
      console.error("Error adding attachment:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  const removeAttachment = async (attachmentId: string) => {
    if (!book) {
      return { success: false, error: "No book selected" };
    }

    try {
      const response = await fetch(
        `/api/books/${book.id}/attachments/${attachmentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (response.ok) {
        setAttachments((prev) => prev.filter((att) => att.id !== attachmentId));
        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to remove attachment",
        };
      }
    } catch (error) {
      console.error("Error removing attachment:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  const updateBook = async (updates: Partial<Book>) => {
    if (!book) {
      return { success: false, error: "No book selected" };
    }

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        setBook(data.book);
        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to update book",
        };
      }
    } catch (error) {
      console.error("Error updating book:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  const updateAttachment = async (
    attachmentId: string,
    updates: {
      name?: string;
      metadata?: any;
      status?: "processing" | "completed" | "failed";
    }
  ) => {
    if (!book) {
      return { success: false, error: "No book selected" };
    }

    try {
      const response = await fetch(
        `/api/books/${book.id}/attachments/${attachmentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Update the attachment in the local state
        setAttachments((prev) =>
          prev.map((att) => (att.id === attachmentId ? data.attachment : att))
        );
        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to update attachment",
        };
      }
    } catch (error) {
      console.error("Error updating attachment:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  const refreshAttachments = async () => {
    if (!book) return;

    try {
      const response = await fetch(`/api/books/${book.id}/attachments`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setAttachments(data.attachments || []);
      }
    } catch (error) {
      console.error("Error refreshing attachments:", error);
    }
  };

  const value = {
    book,
    attachments,
    loading,
    error,
    loadBook,
    addAttachment,
    removeAttachment,
    updateAttachment,
    updateBook,
    refreshAttachments,
  };

  return <BookContext.Provider value={value}>{children}</BookContext.Provider>;
}

export function useBook() {
  const context = useContext(BookContext);
  if (context === undefined) {
    throw new Error("useBook must be used within a BookProvider");
  }
  return context;
}
