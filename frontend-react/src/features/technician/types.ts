export type {
  Incident,
  IncidentComment,
  HistoryEvent,
  PagedResult,
  Dashboard,
  Service,
  Category,
} from '../employee/types';

export interface ResolutionSuggestion {
  incidentId: string;
  reference: string;
  title: string;
  resolutionDetails: string;
  confidenceScore: number;
}

