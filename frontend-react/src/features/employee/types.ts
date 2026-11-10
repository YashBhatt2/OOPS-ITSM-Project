export interface Incident {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  impact: number;
  urgency: number;
  serviceId: string;
  categoryId: string;
  assignedTo?: string;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  responseDueAt?: string;
  resolutionDueAt?: string;
  slaStatus?: string;
  closedAt?: string;
}

export interface IncidentComment {
  id: string;
  body: string;
  kind: 'COMMENT' | 'INFORMATION_REQUEST' | 'INTERNAL_NOTE';
  visibility: 'PUBLIC' | 'INTERNAL';
  createdBy: string;
  createdAt: string;
  authorName?: string;
}

export interface HistoryEvent {
  id: string;
  event: string;
  details?: string;
  createdAt: string;
  actorName?: string;
}

export interface SimilarReport {
  id: string;
  reference: string;
  title: string;
  similarity: number;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Dashboard {
  role: string;
  byStatus: Record<string, number>;
  activeWorkload: number;
  capacity: number;
  unreadNotifications: number;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  criticality: number;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
  serviceId?: string;
}

