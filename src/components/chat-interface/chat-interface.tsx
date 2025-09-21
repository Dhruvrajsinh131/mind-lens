"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import {
  MessageSquare,
  RotateCcw,
  Trash2,
  Database,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ChatMessage from "../chat-message/chat-message";
import ChatInput from "../chat-input/chat-input";
import {
  ChatMessage as ChatMessageType,
  ChatInputData,
  ChatStatus,
} from "@/lib/chat-types";
import { SourceItem } from "@/lib/source-types";
import { queryBookDocumentsStreaming } from "@/lib/api-service";
import { useBook } from "@/contexts/BookContext";

interface ChatInterfaceProps {
  sources: SourceItem[];
  className?: string;
}

// Utility function to generate message ID
const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// AI streaming response function using book-specific API
const getAIStreamingResponse = async (
  bookId: string,
  message: string,
  sources: SourceItem[],
  onChunk: (chunk: string) => void
): Promise<{ success: boolean; error?: string }> => {
  // Check if we have any sources that have been processed (PDFs, websites, YouTube)
  const completedSources = sources.filter((s) => s.status === "completed");

  if (completedSources.length === 0) {
    // If no sources are indexed, provide a helpful message
    const helpMessage =
      "I don't have any indexed sources to reference yet. Please add and process some sources (PDFs, websites, or YouTube videos) first, then I can answer questions about their content.";
    // Simulate streaming for the help message
    for (let i = 0; i < helpMessage.length; i += 2) {
      onChunk(helpMessage.slice(i, i + 2));
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    return { success: true };
  }

  try {
    // Use the book-specific streaming API to query the indexed documents
    const response = await queryBookDocumentsStreaming(bookId, message, onChunk);

    if (response.error) {
      return { success: false, error: response.error };
    }

    return { success: true };
  } catch (error) {
    console.error("Error getting AI response:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  sources,
  className,
}) => {
  const { book } = useBook();
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (inputData: ChatInputData) => {
    if (!inputData.message.trim()) return;

    // Add user message
    const userMessage: ChatMessageType = {
      id: generateMessageId(),
      role: "user",
      content: inputData.message,
      timestamp: new Date(),
      sources: inputData.attachedSources,
    };

    setMessages((prev) => [...prev, userMessage]);
    setChatStatus("thinking");

    // Add loading assistant message
    const loadingMessage: ChatMessageType = {
      id: generateMessageId(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Set the message to streaming state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id ? { ...msg, isLoading: false } : msg
        )
      );

      // Get AI response using streaming API
      if (!book?.id) {
        throw new Error('Book not loaded');
      }

      const result = await getAIStreamingResponse(
        book.id,
        inputData.message,
        sources,
        (chunk: string) => {
          // Update the message content with each streaming chunk
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === loadingMessage.id
                ? {
                    ...msg,
                    content: msg.content + chunk,
                    sources: inputData.attachedSources,
                  }
                : msg
            )
          );
        }
      );

      if (!result.success && result.error) {
        // Handle error
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === loadingMessage.id
              ? {
                  ...msg,
                  content: "",
                  error:
                    result.error || "Failed to get response. Please try again.",
                }
              : msg
          )
        );
        setChatStatus("error");
      } else {
        setChatStatus("idle");
      }
    } catch (error) {
      // Handle error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                content: "",
                isLoading: false,
                error: "Failed to get response. Please try again.",
              }
            : msg
        )
      );
      setChatStatus("error");
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setChatStatus("idle");
  };

  const handleRegenerateLastResponse = async () => {
    if (messages.length < 2) return;

    const lastUserMessage = [...messages]
      .reverse()
      .find((msg) => msg.role === "user");
    if (!lastUserMessage) return;

    // Remove the last assistant message and regenerate
    const messagesWithoutLastAssistant = messages.slice(0, -1);
    setMessages(messagesWithoutLastAssistant);

    await handleSendMessage({
      message: lastUserMessage.content,
      attachedSources: lastUserMessage.sources || [],
    });
  };

  if (false) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center py-12 max-w-md">
            <Database className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No sources added yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add some sources on the left to start chatting about them
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Upload documents (PDF, TXT, DOC, etc.)</p>
              <p>• Add website links</p>
              <p>• Include YouTube videos</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            Analyzing {sources.length} source{sources.length !== 1 ? "s" : ""}
          </span>
        </div>
        {messages.length > 0 && (
          <div className="flex items-center gap-2">
            {messages.length >= 2 && (
              <Button
                onClick={handleRegenerateLastResponse}
                variant="ghost"
                size="sm"
                disabled={chatStatus !== "idle"}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Regenerate
              </Button>
            )}
            <Button
              onClick={handleClearChat}
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12 max-w-lg">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Ready to chat!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Ask questions about your sources below. I can help you:
              </p>
              <div className="text-xs text-muted-foreground space-y-1 text-left">
                <p>• Summarize content from your sources</p>
                <p>• Answer specific questions</p>
                <p>• Compare information across sources</p>
                <p>• Extract key insights and themes</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="shrink-0">
        <ChatInput
          availableSources={sources}
          onSendMessage={handleSendMessage}
          disabled={chatStatus === "thinking"}
          placeholder={
            chatStatus === "thinking"
              ? "Assistant is thinking..."
              : "Ask a question about your sources..."
          }
        />
      </div>
    </div>
  );
};

export default ChatInterface;
