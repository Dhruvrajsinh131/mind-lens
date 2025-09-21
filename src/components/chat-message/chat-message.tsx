"use client";

import React, { ReactElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Avatar } from "../ui/avatar";
import { Button } from "../ui/button";
import {
  User,
  Bot,
  Copy,
  Check,
  Globe,
  Play,
  FileText,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatMessage as ChatMessageType } from "@/lib/chat-types";
import { SourceItem } from "@/lib/source-types";

interface ChatMessageProps {
  message: ChatMessageType;
  className?: string;
}

const sourceIconMap = {
  website: Globe,
  youtube: Play,
  file: FileText,
  text: FileText,
};

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  className,
}) => {
  const [copied, setCopied] = React.useState(false);
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div
      className={cn(
        "group flex gap-4 py-6 px-4 hover:bg-muted/30 transition-colors",
        isUser && "bg-muted/20",
        className
      )}
    >
      <div className="shrink-0">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted border"
          )}
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </div>
      </div>

      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {isUser ? "You" : "Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
          {message.isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="prose prose-sm max-w-none dark:prose-invert">
          {message.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="italic">Thinking...</span>
            </div>
          ) : message.error ? (
            <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>{message.error}</span>
            </div>
          ) : (
            <div className="break-words">
              {isAssistant ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    code: (props) => {
                      const { inline, className, children } = props as {
                        inline: string;
                        className: string;
                        children: ReactElement;
                      };
                      const match = /language-(\w+)/.exec(className || "");
                      return !inline && match ? (
                        <pre className="bg-muted p-3 rounded-lg overflow-x-auto my-2">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                      ) : (
                        <code
                          className="bg-muted px-1.5 py-0.5 rounded text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc ml-4 mb-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal ml-4 mb-2">{children}</ol>
                    ),
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    h1: ({ children }) => (
                      <h1 className="text-lg font-bold mb-2">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-base font-bold mb-2">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-bold mb-2">{children}</h3>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-muted-foreground pl-4 italic my-2">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                <div className="whitespace-pre-wrap">{message.content}</div>
              )}
            </div>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Sources Referenced
            </h5>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source) => {
                const SourceIcon = sourceIconMap[source.type];
                return (
                  <div
                    key={source.id}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-xs border"
                  >
                    <SourceIcon className="h-3 w-3" />
                    <span className="truncate max-w-[120px]">
                      {source.title || source.content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!message.isLoading && !message.error && (
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={handleCopy}
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
