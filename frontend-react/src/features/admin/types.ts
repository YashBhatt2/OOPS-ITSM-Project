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
  requirements?: Record<string, number>;
}

export interface Skill {
  id: string;
  name: string;
  active: boolean;
}

export interface Technician {
  id: string;
  displayName: string;
  email: string;
  available: boolean;
  capacity: number;
  activeWorkload: number;
  experienceMonths: number;
  skills: Record<string, number>;
}

export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  role: string;
  active: boolean;
}

export interface AssignmentCandidate {
  technicianId: string;
  rank: number;
  skillScore?: number;
  name?: string;
  displayName?: string;
  activeWorkload: number;
  capacity: number;
  reasons: string[];
}

export interface AssignmentRecommendation extends AssignmentCandidate {}

export interface AssignmentRecommendationsResponse {
  strategy: string;
  incidentVersion: number;
  candidates: AssignmentCandidate[];
  requiresConfirmation: boolean;
}

export interface Notification {
  id: string;
  message: string;
  incidentId?: string;
  createdAt: string;
  readAt?: string | null;
  emailDelivered?: boolean;
}

export interface ReportOverview {
  total: number;
  byStatus: Array<{ status: string; count: number }>;
  historicallyBreachedIncidents: number;
  totalIncidents?: number;
  openIncidents?: number;
  resolvedToday?: number;
  avgResolutionHours?: number;
  slaBreachRate?: number;
}

export interface TechnicianWorkloadReport {
  technicianId: string;
  displayName?: string;
  name?: string;
  active?: boolean;
  capacity: number;
  activeWorkload: number;
  resolved?: number;
  avgResolutionHours?: number;
}

export interface ServiceReport {
  serviceId: string;
  count?: number;
  totalIncidents?: number;
  name?: string;
  openIncidents?: number;
  breachRate?: number;
  avgResolutionHours?: number;
}
