"use client";

import React from "react";
import { Button } from "../ui/button";
import {
  Globe,
  Play,
  FileText,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceItem } from "@/lib/source-types";

interface SourceListProps {
  sources: SourceItem[];
  onSourceRemove: (sourceId: string) => void;
  className?: string;
}

const iconMap = {
  website: Globe,
  youtube: Play,
  file: FileText,
  text: FileText,
};

const statusConfig = {
  pending: {
    icon: Clock,
    className: "text-yellow-600 bg-yellow-50 border-yellow-200",
    label: "Pending",
  },
  processing: {
    icon: Loader2,
    className: "text-blue-600 bg-blue-50 border-blue-200",
    label: "Processing",
  },
  completed: {
    icon: CheckCircle2,
    className: "text-green-600 bg-green-50 border-green-200",
    label: "Ready",
  },
  error: {
    icon: AlertCircle,
    className: "text-red-600 bg-red-50 border-red-200",
    label: "Error",
  },
};

export const SourceList: React.FC<SourceListProps> = ({
  sources,
  onSourceRemove,
  className,
}) => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  if (sources.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No sources added yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Add websites, YouTube videos, or files to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-muted-foreground">
          Added Sources ({sources.length})
        </h5>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sources.map((source) => {
          const TypeIcon = iconMap[source.type];
          const StatusIcon = statusConfig[source.status].icon;

          return (
            <div
              key={source.id}
              className={cn(
                "group relative p-3 rounded-lg border bg-card transition-all",
                "hover:shadow-sm hover:border-border/60"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {source.title || source.content}
                      </p>
                      {(source.type === "website" ||
                        source.type === "youtube") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => window.open(source.content, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    {source.description && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {source.description}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  onClick={() => onSourceRemove(source.id)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border",
                    statusConfig[source.status].className
                  )}
                >
                  <StatusIcon
                    className={cn(
                      "h-3 w-3",
                      source.status === "processing" && "animate-spin"
                    )}
                  />
                  <span>{statusConfig[source.status].label}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {source.metadata?.fileSize && (
                    <span>{formatFileSize(source.metadata.fileSize)}</span>
                  )}
                  {source.metadata?.fileType && (
                    <span className="uppercase">
                      {source.metadata.fileType.split("/").pop()}
                    </span>
                  )}
                  <span>{formatDate(source.addedAt)}</span>
                </div>
              </div>

              {(source.type === "website" || source.type === "youtube") && (
                <div className="mt-2 p-2 bg-muted/30 rounded text-xs text-muted-foreground font-mono truncate">
                  {source.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SourceList;
