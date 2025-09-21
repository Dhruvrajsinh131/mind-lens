"use client";

import React, { useState, useRef } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Globe,
  Play,
  FileText,
  Plus,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
} from "lucide-react";
import { Attachment, useBook } from "@/contexts/BookContext";

import { cn } from "@/lib/utils";
import {
  SourceItem,
  SourceInputType,
  SourceValidationResult,
} from "@/lib/source-types";
import {
  validateWebsiteUrl,
  validateYouTubeUrl,
  validateFile,
  createSourceItem,
} from "@/lib/source-utils";
import {
  indexBookPdf,
  indexBookWebsite,
  indexBookYouTube,
  uploadFile,
} from "@/lib/api-service";

interface SourceInputProps {
  type: SourceInputType;
  title: string;
  onSourceAdd: (source: Attachment) => void;
  onSourceUpdate?: (sourceId: string, updates: Partial<SourceItem>) => void;
  className?: string;
}

const iconMap = {
  website: Globe,
  youtube: Play,
  file: FileText,
  text: FileText,
};

export const SourceInput: React.FC<SourceInputProps> = ({
  type,
  title,
  onSourceAdd,
  onSourceUpdate,
  className,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [validation, setValidation] = useState<SourceValidationResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { book, addAttachment, updateAttachment } = useBook();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const Icon = iconMap[type];

  const validateInput = (value: string): SourceValidationResult => {
    switch (type) {
      case "website":
        return validateWebsiteUrl(value);
      case "youtube":
        return validateYouTubeUrl(value);
      default:
        return { isValid: true, errors: [], warnings: [] };
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim()) {
      setValidation(validateInput(value));
    } else {
      setValidation(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    setValidation(null);

    try {
      for (const file of Array.from(files)) {
        const fileValidation = validateFile(file);
        if (!fileValidation.isValid) {
          setValidation(fileValidation);
          continue;
        }

        // 1️⃣ Upload file
        const uploadResult = await uploadFile(file);
        if (!uploadResult.success) {
          setValidation({
            isValid: false,
            errors: [uploadResult.error || "Failed to upload file"],
            warnings: [],
          });
          continue;
        }

        // 2️⃣ Add attachment to BookContext
        const attachmentData = {
          type: "file" as const,
          name: file.name,
          filePath: uploadResult.filePath,
          originalFileName: uploadResult.originalName,
          fileSize: uploadResult.size,
          mimeType: uploadResult.type,
          metadata: { title: file.name },
        };

        const result = await addAttachment(attachmentData);
        if (!result.success || !result.attachment) {
          setValidation({
            isValid: false,
            errors: [result.error || "Failed to add attachment"],
            warnings: [],
          });
          continue;
        }

        const attachment = result.attachment;
        onSourceAdd(attachment); // Add to local UI

        // 3️⃣ Index PDF if applicable
        if (
          file.type === "application/pdf" ||
          file.name.toLowerCase().endsWith(".pdf")
        ) {
          try {
            const indexResult = await indexBookPdf(
              book!.id,
              attachment.id,
              attachment.filePath!
            );

            if (indexResult.status === "Indexing Done") {
              await updateAttachment?.(attachment.id, { status: "completed" });
            } else {
              await updateAttachment?.(attachment.id, { status: "failed" });
              setValidation({
                isValid: false,
                errors: [indexResult.error || "Failed to index PDF"],
                warnings: [],
              });
            }
          } catch (error) {
            await updateAttachment?.(attachment.id, { status: "failed" });
            setValidation({
              isValid: false,
              errors: [
                "Failed to index PDF: " +
                  (error instanceof Error ? error.message : "Unknown error"),
              ],
              warnings: [],
            });
          }
        } else {
          // Non-PDF files are marked completed
          await updateAttachment?.(attachment.id, { status: "completed" });
        }
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error(error);
      setValidation({
        isValid: false,
        errors: ["Failed to process files"],
        warnings: [],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (type === "file") return;

    const currentValidation = validateInput(inputValue);
    setValidation(currentValidation);

    if (currentValidation.isValid && currentValidation.normalizedValue) {
      // 1️⃣ Create attachment in DB first
      const { success, attachment, error } = await addAttachment({
        type,
        name:
          type === "website"
            ? currentValidation.normalizedValue
            : "YouTube Video",
        url: currentValidation.normalizedValue,
        metadata: { title: currentValidation.normalizedValue },
      });

      if (!success || !attachment) {
        setValidation({
          isValid: false,
          errors: [error || "Failed to create attachment"],
          warnings: [],
        });
        setIsLoading(false);
        return;
      }

      onSourceAdd(attachment); // add to local UI

      try {
        // 2️⃣ Index the attachment
        let indexResult;
        switch (type) {
          case "website":
            indexResult = await indexBookWebsite(
              book!.id,
              attachment.id,
              currentValidation.normalizedValue
            );
            break;
          case "youtube":
            indexResult = await indexBookYouTube(
              book!.id,
              attachment.id,
              currentValidation.normalizedValue
            );
            break;
        }

        if (indexResult!.status === "Indexing Done") {
          await updateAttachment?.(attachment.id, { status: "completed" });
        } else {
          await updateAttachment?.(attachment.id, { status: "failed" });
          setValidation({
            isValid: false,
            errors: [indexResult!.error || "Failed to index"],
            warnings: [],
          });
        }
      } catch (err) {
        await updateAttachment?.(attachment.id, { status: "failed" });
        setValidation({
          isValid: false,
          errors: [(err as Error).message],
          warnings: [],
        });
      } finally {
        setIsLoading(false);
      }

      setInputValue("");
      setValidation(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const clearValidation = () => {
    setValidation(null);
  };

  const getPlaceholder = () => {
    switch (type) {
      case "website":
        return "Enter website URL (e.g., https://example.com)";
      case "youtube":
        return "Enter YouTube URL (e.g., https://youtube.com/watch?v=...)";
      case "file":
        return "Select files to upload";
      default:
        return "Enter source";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        <h4 className="text-lg font-semibold text-foreground">{title}</h4>
      </div>

      <div className="space-y-2">
        {type === "file" ? (
          <div className="space-y-2">
            <Label
              htmlFor={`file-input-${type}`}
              className="text-sm font-medium"
            >
              Choose Files
            </Label>
            <div className="relative">
              <Input
                ref={fileInputRef}
                id={`file-input-${type}`}
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx,.csv,.json,.md"
                onChange={handleFileChange}
                disabled={isLoading}
                className={cn(
                  "cursor-pointer file:cursor-pointer",
                  "hover:bg-accent/50 transition-colors",
                  validation?.errors.length &&
                    "border-destructive focus-visible:ring-destructive/20"
                )}
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor={`input-${type}`} className="text-sm font-medium">
              {title}
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  id={`input-${type}`}
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={getPlaceholder()}
                  className={cn(
                    "pr-8",
                    validation?.isValid === true &&
                      "border-green-500 focus-visible:ring-green-500/20",
                    validation?.isValid === false &&
                      "border-destructive focus-visible:ring-destructive/20"
                  )}
                />
                {validation && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {validation.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={
                  !inputValue.trim() ||
                  validation?.isValid === false ||
                  isLoading
                }
                size="icon"
                className="shrink-0"
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        {validation &&
          (validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-1">
              {validation.errors.map((error, index) => (
                <div
                  key={`error-${index}`}
                  className="flex items-center gap-2 text-sm text-destructive"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>{error}</span>
                  <Button
                    onClick={clearValidation}
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-destructive hover:text-destructive/80"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {validation.warnings.map((warning, index) => (
                <div
                  key={`warning-${index}`}
                  className="flex items-center gap-2 text-sm text-yellow-600"
                >
                  <AlertCircle className="h-3 w-3" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

        {validation?.isValid && inputValue.trim() && (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span>Valid {type} URL</span>
          </div>
        )}

        {type === "file" && (
          <div className="text-xs text-muted-foreground">
            Supported formats: PDF, TXT, DOC, DOCX, CSV, JSON, MD (max 50MB)
          </div>
        )}
      </div>
    </div>
  );
};

export default SourceInput;
