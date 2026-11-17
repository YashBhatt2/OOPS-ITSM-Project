import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { Service } from '@/features/employee/types';
import styles from './IncidentFilters.module.css';

export interface FilterState {
  status: string;
  priority: string;
  slaStatus: string;
  serviceId: string;
  includeClosed: boolean;
  sort: string;
}

export interface IncidentFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function IncidentFilters({ filters, onChange }: IncidentFiltersProps) {
  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => apiRequest('/api/v1/services'),
  });

  const update = (patch: Partial<FilterState>) => {
    onChange({ ...filters, ...patch });
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterRow}>
        {/* Status Filter */}
        <select
          className={styles.filterSelect}
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="NEW">New</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="VERIFIED">Verified</option>
          <option value="CLOSED">Closed</option>
        </select>

        {/* Priority Filter */}
        <select
          className={styles.filterSelect}
          value={filters.priority}
          onChange={(e) => update({ priority: e.target.value })}
          aria-label="Filter by priority"
        >
          <option value="ALL">All priorities</option>
          <option value="P1">P1 — Critical</option>
          <option value="P2">P2 — High</option>
          <option value="P3">P3 — Moderate</option>
          <option value="P4">P4 — Low</option>
        </select>

        {/* SLA Status Filter */}
        <select
          className={styles.filterSelect}
          value={filters.slaStatus}
          onChange={(e) => update({ slaStatus: e.target.value })}
          aria-label="Filter by SLA status"
        >
          <option value="ALL">All SLA states</option>
          <option value="ON_TRACK">On track</option>
          <option value="AT_RISK">At risk</option>
          <option value="BREACHED">Breached</option>
        </select>

        {/* Service Filter */}
        <select
          className={styles.filterSelect}
          value={filters.serviceId}
          onChange={(e) => update({ serviceId: e.target.value })}
          aria-label="Filter by service"
        >
          <option value="ALL">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Sort Filter */}
        <select
          className={styles.filterSelect}
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
          aria-label="Sort order"
        >
          <option value="updatedAt,desc">Last updated (newest)</option>
          <option value="createdAt,desc">Reported (newest)</option>
          <option value="createdAt,asc">Reported (oldest)</option>
          <option value="priority,asc">Priority (P1 first)</option>
        </select>

        {/* Include Closed Checkbox */}
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={filters.includeClosed}
            onChange={(e) => update({ includeClosed: e.target.checked })}
          />
          <span>Include closed</span>
        </label>
      </div>
    </div>
  );
}

