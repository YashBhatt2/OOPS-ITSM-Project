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

export interface AssignmentRecommendation {
  technicianId: string;
  rank: number;
  name: string;
  activeWorkload: number;
  capacity: number;
  reasons: string[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  incidentId?: string;
}

export interface ReportOverview {
  totalIncidents: number;
  openIncidents: number;
  resolvedToday: number;
  avgResolutionHours: number;
  slaBreachRate: number;
}

export interface TechnicianWorkloadReport {
  technicianId: string;
  name: string;
  active: boolean;
  capacity: number;
  activeWorkload: number;
  resolved: number;
  avgResolutionHours: number;
}

export interface ServiceReport {
  serviceId: string;
  name: string;
  totalIncidents: number;
  openIncidents: number;
  breachRate: number;
  avgResolutionHours: number;
}
