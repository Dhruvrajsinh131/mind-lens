export interface SourceItem {
  id: string;
  type: "website" | "youtube" | "file" | "text";
  name: string;
  content: string;
  url?: string;
  title?: string;
  description?: string;
  thumbnail?: string;
  error?: string;
  addedAt: Date;
  status: "pending" | "processing" | "completed" | "error";
  metadata?: {
    fileSize?: number;
    fileType?: string;
    duration?: number;
    wordCount?: number;
    url?: string;
  };
}

export interface SourceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  normalizedValue?: string;
}

export type SourceInputType = "website" | "youtube" | "file" | "text";

export interface SourceInputConfig {
  type: SourceInputType;
  placeholder: string;
  validation: (value: string) => SourceValidationResult;
  formatter: (value: string) => string;
  icon: string;
  acceptedFormats?: string[];
}
