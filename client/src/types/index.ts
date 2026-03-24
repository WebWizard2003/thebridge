export enum ConversationType {
  DIRECT = "DIRECT",
  GROUP = "GROUP",
}

export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export enum MessageType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  DOCUMENT = "DOCUMENT",
}

export enum MessageStatusType {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
}

export enum StoryType {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  id: string;
  userId: string;
  conversationId: string;
  role: MemberRole;
  joinedAt: string;
  user: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content?: string;
  mediaUrl?: string;
  fileName?: string;
  createdAt: string;
  updatedAt: string;
  sender: User;
  statuses?: MessageStatus[];
}

export interface MessageStatus {
  id: string;
  messageId: string;
  userId: string;
  status: MessageStatusType;
  createdAt: string;
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name?: string;
  avatarUrl?: string;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  members: ConversationMember[];
  lastMessage?: Message;
  unreadCount?: number;
}

export interface Story {
  id: string;
  userId: string;
  type: StoryType;
  content?: string;
  mediaUrl?: string;
  backgroundColor?: string;
  expiresAt: string;
  createdAt: string;
  user: User;
  viewCount?: number;
  viewed?: boolean;
}

export interface StoryView {
  id: string;
  storyId: string;
  userId: string;
  viewedAt: string;
  user: User;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadResponse {
  url: string;
  fileName: string;
}
