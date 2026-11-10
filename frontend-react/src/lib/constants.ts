export const PRODUCT_NAME = "Service Desk";

export const spring = {
  snappy: { type: "spring" as const, stiffness: 380, damping: 32, mass: 0.9 },
  gentle: { type: "spring" as const, stiffness: 170, damping: 26, mass: 1 },
};

export type Role = "EMPLOYEE" | "TECHNICIAN" | "ADMIN";

export type Priority = "P1" | "P2" | "P3" | "P4";

export type IncidentStatus =
  | "NEW"
  | "ASSIGNED"
  | "ACKNOWLEDGED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "VERIFIED"
  | "CLOSED";

export type SlaStatus = "ON_TRACK" | "AT_RISK" | "BREACHED";

