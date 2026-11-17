import { apiRequest } from './api';

export interface DuplicateSuggestion {
  message: string;
  similarityScore: number;
}

export interface ResolutionSuggestion {
  incidentId: string;
  similarityScore: number;
  resolutionText: string;
}

interface SuggestionResponse<T> {
  status: 'AVAILABLE';
  modelVersion?: string;
  suggestions: T[];
}

export async function fetchDuplicateSuggestions(
  input: { title: string; description: string; serviceId: string; categoryId: string },
  signal?: AbortSignal
): Promise<DuplicateSuggestion[]> {
  const response = await apiRequest<SuggestionResponse<DuplicateSuggestion>>(
    '/api/v1/incident-suggestions/duplicates',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal,
    }
  );
  return response.suggestions;
}

export async function fetchResolutionSuggestions(
  incidentId: string,
  signal?: AbortSignal
): Promise<ResolutionSuggestion[]> {
  const response = await apiRequest<SuggestionResponse<ResolutionSuggestion>>(
    `/api/v1/incidents/${incidentId}/resolution-suggestions`,
    { signal }
  );
  return response.suggestions;
}
