"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Send,
  Paperclip,
  Globe,
  Play,
  FileText,
  X,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceItem } from "@/lib/source-types";
import { ChatInputData } from "@/lib/chat-types";

interface ChatInputProps {
  availableSources: SourceItem[];
  onSendMessage: (data: ChatInputData) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const sourceIconMap = {
  website: Globe,
  youtube: Play,
  file: FileText,
  text: FileText,
};

export const ChatInput: React.FC<ChatInputProps> = ({
  availableSources,
  onSendMessage,
  disabled = false,
  placeholder = "Message Assistant...",
  className,
}) => {
  const [message, setMessage] = useState("");
  const [selectedSources, setSelectedSources] = useState<SourceItem[]>([]);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Auto-select all sources when user starts typing
  useEffect(() => {
    if (
      message.trim() &&
      selectedSources.length === 0 &&
      availableSources.length > 0
    ) {
      setSelectedSources(availableSources);
    }
  }, [message, selectedSources.length, availableSources]);

  const handleSubmit = () => {
    if (!message.trim() || disabled) return;

    onSendMessage({
      message: message.trim(),
      attachedSources: selectedSources,
    });

    setMessage("");
    setSelectedSources([]);
    setShowSourcePicker(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const toggleSource = (source: SourceItem) => {
    setSelectedSources((prev) => {
      const exists = prev.find((s) => s.id === source.id);
      if (exists) {
        return prev.filter((s) => s.id !== source.id);
      } else {
        return [...prev, source];
      }
    });
  };

  const removeSource = (sourceId: string) => {
    setSelectedSources((prev) => prev.filter((s) => s.id !== sourceId));
  };

  const canSend = message.trim().length > 0 && !disabled;

  return (
    <div className={cn("border-t border-border/50 bg-background", className)}>
      {/* Selected Sources Bar */}
      {selectedSources.length > 0 && (
        <div className="px-4 py-2 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">
              Using sources:
            </span>
            {selectedSources.map((source) => {
              const SourceIcon = sourceIconMap[source.type];
              return (
                <div
                  key={source.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs"
                >
                  <SourceIcon className="h-3 w-3" />
                  <span className="truncate max-w-[100px]">
                    {source.title || source.content}
                  </span>
                  <Button
                    onClick={() => removeSource(source.id)}
                    variant="ghost"
                    size="sm"
                    className="h-auto w-auto p-0 ml-1 hover:bg-transparent"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="p-4">
        <div className="relative">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "w-full resize-none border-0 bg-transparent px-4 py-3 pr-12",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-0",
              "min-h-[44px] max-h-[200px]",
              "scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
            )}
            style={{
              minHeight: "44px",
              lineHeight: "1.5",
            }}
          />

          {/* Send Button */}
          <div className="absolute right-2 bottom-2">
            <Button
              onClick={handleSubmit}
              disabled={!canSend}
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full transition-all",
                canSend ? "bg-primary hover:bg-primary/90" : "bg-muted"
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Source Picker Button */}
          {availableSources.length > 0 && (
            <div className="absolute left-2 bottom-2">
              <Button
                onClick={() => setShowSourcePicker(!showSourcePicker)}
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 rounded-full",
                  selectedSources.length > 0 && "bg-primary/10 text-primary"
                )}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Source Picker Dropdown */}
        {showSourcePicker && availableSources.length > 0 && (
          <div className="mt-3 p-3 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                Select sources to reference:
              </span>
              <Button
                onClick={() => setShowSourcePicker(false)}
                variant="ghost"
                size="sm"
                className="h-auto p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {availableSources.map((source) => {
                const SourceIcon = sourceIconMap[source.type];
                const isSelected = selectedSources.find(
                  (s) => s.id === source.id
                );

                return (
                  <div
                    key={source.id}
                    onClick={() => toggleSource(source)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border-2 flex items-center justify-center",
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground"
                      )}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <SourceIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate flex-1">
                      {source.title || source.content}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Helper Text */}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>
            {availableSources.length > 0
              ? `${availableSources.length} source${
                  availableSources.length !== 1 ? "s" : ""
                } available`
              : "No sources available"}
          </span>
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
