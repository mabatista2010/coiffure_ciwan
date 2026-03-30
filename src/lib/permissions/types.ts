import type { ScopeMode, StaffRole, PermissionSource } from './catalog';

export type PermissionState = {
  key: string;
  allowed: boolean;
  scope: ScopeMode;
  source: PermissionSource;
};

export type PermissionScopeFilter =
  | { kind: 'all'; scope: ScopeMode }
  | { kind: 'none'; scope: ScopeMode; code: string }
  | { kind: 'stylist'; scope: ScopeMode; stylistId: string }
  | { kind: 'locations'; scope: ScopeMode; locationIds: string[] };

export type StaffAccessContext = {
  userId: string;
  role: StaffRole;
  profileKey: string | null;
  profileName: string | null;
  associatedStylistId: string | null;
  assignedLocationIds: string[];
  permissions: Record<string, PermissionState>;
};
