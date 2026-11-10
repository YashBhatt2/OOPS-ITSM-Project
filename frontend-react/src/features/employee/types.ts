export interface Incident {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: string;
  priority?: string;
  effectivePriority?: string;
  calculatedPriority?: string;
  impact: number;
  urgency: number;
  serviceId: string;
  categoryId: string;
  assignedTechnicianId?: string;
  assignedTo?: string;
  reporterId?: string;
  reportedBy?: string;
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
  kind: 'COMMENT' | 'NOTE' | 'INFORMATION_REQUEST' | 'INTERNAL_NOTE' | 'REPLY';
  visibility: 'PUBLIC' | 'INTERNAL';
  authorId?: string;
  createdBy?: string;
  createdAt: string;
  authorName?: string;
}

export interface HistoryEvent {
  id: string;
  event?: string;
  action?: string;
  details?: string;
  description?: string;
  createdAt: string;
  actorName?: string;
  actorId?: string;
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

