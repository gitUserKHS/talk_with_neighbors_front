import { ReportReason, SafetyTargetType } from './safety';

export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface AdminReport {
  id: string;
  targetType: SafetyTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string | null;
  status: ReportStatus;
  reporterId?: number | null;
  reporterUsername?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
  reviewedByUsername?: string | null;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  /** 같은 대상에 접수된 전체 신고 수. 반복 신고를 알아보기 위한 신호다. */
  reportsOnSameTarget: number;
}

export interface ReportedContent {
  available: boolean;
  authorId?: number | null;
  authorUsername?: string | null;
  text?: string | null;
  imageUrl?: string | null;
  createdAt?: string | null;
}

export interface AdminReportDetail {
  report: AdminReport;
  content: ReportedContent;
}

export type ReportStatusCounts = Partial<Record<ReportStatus, number>>;
