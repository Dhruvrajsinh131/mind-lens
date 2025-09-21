export interface IndexPdfRequest {
  pdfPath: string;
}

export interface IndexPdfResponse {
  status: string;
  documentsProcessed?: number;
  sourceType?: string;
  bookId?: string;
  attachmentId?: string;
  collectionName?: string;
  error?: string;
}

export interface QueryRequest {
  userQuery: string;
  includeAllBooks?: boolean;
}

export interface QueryResponse {
  answer: string;
  error?: string;
}

/**
 * Index different source types using the indexing API
 */
export async function indexSource(
  sourceType: "pdf" | "website" | "youtube",
  sourceData: {
    filePath?: string;
    sourceUrl?: string;
    youtubeUrl?: string;
  }
): Promise<IndexPdfResponse> {
  try {
    const response = await fetch("/api/index-pdf", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sourceType,
        ...sourceData,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error indexing ${sourceType}:`, error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Index a PDF file using the PDF indexing API (backward compatibility)
 */
// export async function indexPdf(pdfPath: string): Promise<IndexPdfResponse> {
//   return indexSource("pdf", { filePath: pdfPath });
// }

/**
 * Index a website URL
 */
// export async function indexWebsite(
//   websiteUrl: string
// ): Promise<IndexPdfResponse> {
//   return indexSource("website", { sourceUrl: websiteUrl });
// }

/**
 * Index a YouTube video (placeholder for your implementation)
 */
// export async function indexYouTube(
//   youtubeUrl: string
// ): Promise<IndexPdfResponse> {
//   return indexSource("youtube", { youtubeUrl });
// }

export async function indexBookPdf(
  bookId: string,
  attachmentId: string,
  filePath: string
) {
  return indexBookSource(bookId, attachmentId, "pdf", { filePath });
}

export async function indexBookWebsite(
  bookId: string,
  attachmentId: string,
  sourceUrl: string
) {
  return indexBookSource(bookId, attachmentId, "website", { sourceUrl });
}

export async function indexBookYouTube(
  bookId: string,
  attachmentId: string,
  sourceUrl: string
) {
  return indexBookSource(bookId, attachmentId, "youtube", { sourceUrl });
}

export async function queryDocumentsStreaming(
  userQuery: string,
  onChunk: (chunk: string) => void
): Promise<QueryResponse> {
  try {
    const response = await fetch("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userQuery }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              return { answer: fullAnswer };
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullAnswer += parsed.content;
                onChunk(parsed.content);
              }
            } catch (e) {}
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { answer: fullAnswer };
  } catch (error) {
    console.error("Error querying documents:", error);
    return {
      answer: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function queryDocuments(
  userQuery: string
): Promise<QueryResponse> {
  return new Promise((resolve) => {
    let fullAnswer = "";
    queryDocumentsStreaming(userQuery, (chunk) => {
      fullAnswer += chunk;
    })
      .then((result) => {
        resolve({ answer: fullAnswer, error: result.error });
      })
      .catch((error) => {
        resolve({
          answer: "",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      });
  });
}

export async function uploadFile(file: File): Promise<{
  type?: any;
  size?: any;
  originalName?: any;
  success: boolean;
  filePath?: string;
  error?: string;
}> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return {
        success: true,
        filePath: result.filePath,
      };
    } else {
      return {
        success: false,
        error: result.error || "Upload failed",
      };
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Index a source for a specific book
 */
export async function indexBookSource(
  bookId: string,
  attachmentId: string,
  sourceType: "pdf" | "website" | "youtube",
  sourceData: {
    filePath?: string;
    sourceUrl?: string;
  }
): Promise<IndexPdfResponse> {
  try {
    const response = await fetch(`/api/books/${bookId}/index`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        attachmentId,
        sourceType,
        ...sourceData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    console.error(`Error indexing ${sourceType} for book:`, error);
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Query documents for a specific book with streaming response
 */
export async function queryBookDocumentsStreaming(
  bookId: string,
  userQuery: string,
  onChunk: (chunk: string) => void,
  includeAllBooks = false
): Promise<QueryResponse> {
  try {
    const response = await fetch(`/api/books/${bookId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userQuery,
        includeAllBooks,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullAnswer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (data === "[DONE]") {
              return { answer: fullAnswer };
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullAnswer += parsed.content;
                onChunk(parsed.content);
              }
            } catch (e) {
              // Ignore parsing errors for streaming chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { answer: fullAnswer };
  } catch (error) {
    console.error("Error querying book documents:", error);
    return {
      answer: "",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Query documents for a specific book (non-streaming)
 */
export async function queryBookDocuments(
  bookId: string,
  userQuery: string,
  includeAllBooks = false
): Promise<QueryResponse> {
  return new Promise((resolve) => {
    let fullAnswer = "";
    queryBookDocumentsStreaming(
      bookId,
      userQuery,
      (chunk) => {
        fullAnswer += chunk;
      },
      includeAllBooks
    )
      .then((result) => {
        resolve({ answer: fullAnswer, error: result.error });
      })
      .catch((error) => {
        resolve({
          answer: "",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      });
  });
}

export function checkEnvironment(): {
  isValid: boolean;
  missingVars: string[];
} {
  const requiredVars = ["OPENAI_API_KEY"];
  const missingVars: string[] = [];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}
