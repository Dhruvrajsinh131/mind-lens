import { SourceItem } from './source-types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: SourceItem[];
  isLoading?: boolean;
  error?: string;
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  title?: string;
}

export interface ChatInputData {
  message: string;
  attachedSources: SourceItem[];
}

export interface ChatResponse {
  content: string;
  sources?: SourceItem[];
  error?: string;
}

export type ChatStatus = 'idle' | 'typing' | 'thinking' | 'error';
