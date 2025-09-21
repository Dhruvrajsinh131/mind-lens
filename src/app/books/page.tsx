"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/navbar/navbar";
import {
  Plus,
  BookOpen,
  Clock,
  FileText,
  MoreHorizontal,
  Edit2,
  Trash2,
  Search,
} from "lucide-react";

interface Book {
  _id: string;
  title: string;
  description: string;
  coverImage?: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  attachmentCount?: number;
}

export default function BooksPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBookData, setNewBookData] = useState({
    title: "",
    description: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch("/api/books", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setBooks(data.books || []);
      } else {
        console.error("Failed to fetch books");
      }
    } catch (error) {
      console.error("Error fetching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const createBook = async () => {
    if (!newBookData.title.trim()) return;

    setCreateLoading(true);
    try {
      const response = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newBookData),
      });

      if (response.ok) {
        const data = await response.json();
        setBooks((prev) => [data.book, ...prev]);
        setCreateModalOpen(false);
        setNewBookData({ title: "", description: "" });
        // Navigate to the new book
        router.push(`/book/${data.book.id}`);
      } else {
        const error = await response.json();
        console.error("Failed to create book:", error.error);
      }
    } catch (error) {
      console.error("Error creating book:", error);
    } finally {
      setCreateLoading(false);
    }
  };

  const openBook = (bookId: string) => {
    router.push(`/book/${bookId}`);
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Books</h1>
              <p className="text-muted-foreground">
                Organize your knowledge into books and add sources to each one.
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Book
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-8">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Books Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-lg h-48"></div>
                </div>
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {searchQuery ? "No books found" : "No books yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search terms."
                  : "Create your first book to start organizing your knowledge."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Book
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <div
                  key={book._id}
                  className="group bg-card border rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => openBook(book._id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                        {book.title}
                      </h3>
                      {book.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {book.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{book.attachmentCount || 0} sources</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>
                        {new Date(book.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create Book Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-background border rounded-lg shadow-lg w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">Create New Book</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCreateModalOpen(false)}
                  className="h-8 w-8"
                >
                  ✕
                </Button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Enter book title"
                    value={newBookData.title}
                    onChange={(e) =>
                      setNewBookData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Brief description (optional)"
                    value={newBookData.description}
                    onChange={(e) =>
                      setNewBookData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    maxLength={500}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCreateModalOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={createBook}
                    disabled={!newBookData.title.trim() || createLoading}
                    className="flex-1"
                  >
                    {createLoading ? "Creating..." : "Create Book"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
