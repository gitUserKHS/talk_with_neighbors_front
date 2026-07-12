export type SafetyTargetType = 'USER' | 'FEED_POST' | 'COMMENT' | 'MESSAGE';

export type ReportReason =
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'SPAM'
  | 'INAPPROPRIATE_CONTENT'
  | 'IMPERSONATION'
  | 'PRIVACY'
  | 'OTHER';

export interface CreateReportRequest {
  targetType: SafetyTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
  hideContent: boolean;
}

export interface SafetyReport {
  id: string;
  targetType: SafetyTargetType;
  targetId: string;
  reason: ReportReason;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface BlockedUser {
  userId: number;
  username: string;
  profileImage?: string;
  blockedAt: string;
}
