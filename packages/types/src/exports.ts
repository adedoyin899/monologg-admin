export type ExportType =
  | "users"
  | "bookings"
  | "payments"
  | "withdrawals"
  | "tickets"
  | "funnels"
  | "audit";

export type ExportStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED";

export interface AdminExportJobItem {
  id: string;
  type: ExportType;
  status: ExportStatus;
  requestedByAdminId: string;
  requestedByEmail?: string;
  reason: string;
  rowCount: number;
  downloadUrl?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
  error?: string | null;
  piiUnmasked: boolean;
}

export interface AdminExportListResponse {
  exports: AdminExportJobItem[];
  total: number;
}

export interface CreateExportRequest {
  type: ExportType;
  reason: string;
  unmaskPii?: boolean;
  filters?: Record<string, any>;
}

export interface CreateExportResponse {
  jobId: string;
  status: ExportStatus;
  type: ExportType;
  message: string;
  estimatedRows: number;
}
