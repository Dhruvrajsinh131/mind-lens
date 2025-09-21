import {
  SourceValidationResult,
  SourceInputConfig,
  SourceItem,
} from "./source-types";

const URL_PATTERNS = {
  website:
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  youtube:
    /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)[a-zA-Z0-9_-]{11}/,
};

export const validateWebsiteUrl = (url: string): SourceValidationResult => {
  const trimmed = url.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errors: ["URL is required"],
      warnings: [],
    };
  }

  if (!URL_PATTERNS.website.test(trimmed)) {
    return {
      isValid: false,
      errors: ["Please enter a valid website URL (e.g., https://example.com)"],
      warnings: [],
    };
  }

  let normalized = trimmed;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    normalized = `https://${trimmed}`;
  }

  return {
    isValid: true,
    errors: [],
    warnings: [],
    normalizedValue: normalized,
  };
};

export const validateYouTubeUrl = (url: string): SourceValidationResult => {
  const trimmed = url.trim();

  if (!trimmed) {
    return {
      isValid: false,
      errors: ["YouTube URL is required"],
      warnings: [],
    };
  }

  if (!URL_PATTERNS.youtube.test(trimmed)) {
    return {
      isValid: false,
      errors: [
        "Please enter a valid YouTube URL (e.g., https://youtube.com/watch?v=...)",
      ],
      warnings: [],
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings: [],
    normalizedValue: trimmed,
  };
};

export const validateFile = (file: File): SourceValidationResult => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/json",
    "text/markdown",
  ];

  const errors: string[] = [];
  const warnings: string[] = [];

  if (file.size > maxSize) {
    errors.push(
      `File size must be less than 50MB. Current size: ${(
        file.size /
        1024 /
        1024
      ).toFixed(1)}MB`
    );
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(
      `File type not supported. Allowed types: PDF, TXT, DOC, DOCX, CSV, JSON, MD`
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    warnings.push("Large files may take longer to process");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    normalizedValue: file.name,
  };
};

export const formatWebsiteUrl = (url: string): string => {
  let formatted = url.trim();
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `https://${formatted}`;
  }
  return formatted;
};

export const formatYouTubeUrl = (url: string): string => {
  return url.trim();
};

export const extractYouTubeVideoId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
};

export const generateSourceId = (): string => {
  return `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createSourceItem = (
  type: SourceItem["type"],
  content: string,
  metadata?: SourceItem["metadata"]
): SourceItem => {
  // For URL-based sources (website, youtube), set name to the URL
  const name = type === "website" || type === "youtube" ? content : content;
  const url = type === "website" || type === "youtube" ? content : undefined;

  return {
    id: generateSourceId(),
    type,
    name,
    content,
    url,
    addedAt: new Date(),
    status: "pending",
    metadata,
  };
};

export const sourceConfigs: Record<string, SourceInputConfig> = {
  website: {
    type: "website",
    placeholder: "Enter website URL (e.g., https://example.com)",
    validation: validateWebsiteUrl,
    formatter: formatWebsiteUrl,
    icon: "Globe",
  },
  youtube: {
    type: "youtube",
    placeholder: "Enter YouTube URL (e.g., https://youtube.com/watch?v=...)",
    validation: validateYouTubeUrl,
    formatter: formatYouTubeUrl,
    icon: "Play",
  },
  file: {
    type: "file",
    placeholder: "Select files to upload",
    validation: () => ({ isValid: true, errors: [], warnings: [] }),
    formatter: (value: string) => value,
    icon: "FileText",
    acceptedFormats: [".pdf", ".txt", ".doc", ".docx", ".csv", ".json", ".md"],
  },
};
