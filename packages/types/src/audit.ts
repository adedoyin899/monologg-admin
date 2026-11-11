export interface AdminAuditLogItem {
  id: string;
  adminId: string;
  adminEmail?: string;
  adminRole?: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: Record<string, any>;
  ipHash: string | null;
  createdAt: string;
}

export interface AdminAuditListResponse {
  logs: AdminAuditLogItem[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AdminAuditFilters {
  adminId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  cursor?: string;
}
