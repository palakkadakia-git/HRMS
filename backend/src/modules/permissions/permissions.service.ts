import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type AppModule = 'employees' | 'attendance' | 'leave' | 'payroll' | 'advances' | 'penalties' | 'reports' | 'settings' | 'kiosk';
export type CrudAction = 'create' | 'read' | 'update' | 'delete';

export interface PermissionRow {
  role:      string;
  module:    string;
  canCreate: boolean;
  canRead:   boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

// ── Seed defaults ─────────────────────────────────────────────────────────────

const DEFAULTS: PermissionRow[] = [
  // HR
  { role: 'HR', module: 'employees',  canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'HR', module: 'attendance', canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'HR', module: 'leave',      canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'HR', module: 'payroll',    canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'HR', module: 'reports',    canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'HR', module: 'settings',   canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'HR', module: 'advances',   canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'HR', module: 'penalties',  canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'HR', module: 'kiosk',      canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  // ACCOUNTS
  { role: 'ACCOUNTS', module: 'employees',  canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'ACCOUNTS', module: 'attendance', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'ACCOUNTS', module: 'leave',      canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'ACCOUNTS', module: 'payroll',    canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'ACCOUNTS', module: 'reports',    canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'ACCOUNTS', module: 'settings',   canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'ACCOUNTS', module: 'advances',   canCreate: true,  canRead: true, canUpdate: true,  canDelete: true  },
  { role: 'ACCOUNTS', module: 'penalties',  canCreate: false, canRead: true, canUpdate: false, canDelete: false },
  { role: 'ACCOUNTS', module: 'kiosk',      canCreate: false, canRead: true, canUpdate: false, canDelete: false },
];

const ALL_MODULES: AppModule[] = ['employees', 'attendance', 'leave', 'payroll', 'advances', 'penalties', 'reports', 'settings', 'kiosk'];

// ── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_TTL = 60_000; // 60 s

@Injectable()
export class PermissionsService implements OnModuleInit {
  private cache = new Map<string, { rows: PermissionRow[]; expiresAt: number }>();

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Full matrix for the Settings UI (all non-ADMIN roles × all modules). */
  async findAll(): Promise<PermissionRow[]> {
    return this.prisma.rolePermission.findMany({
      where: { role: { not: 'ADMIN' } },
      orderBy: [{ role: 'asc' }, { module: 'asc' }],
    }) as unknown as PermissionRow[];
  }

  /** Permissions for the current user's role (frontend `/permissions/me` endpoint). */
  async getForRole(role: string): Promise<PermissionRow[]> {
    const hit = this.cache.get(role);
    if (hit && hit.expiresAt > Date.now()) return hit.rows;

    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
    }) as PermissionRow[];

    this.cache.set(role, { rows, expiresAt: Date.now() + CACHE_TTL });
    return rows;
  }

  /** Upsert a single role × module row. Invalidates the cache for that role. */
  async upsert(
    role: string,
    module: string,
    flags: { canCreate: boolean; canRead: boolean; canUpdate: boolean; canDelete: boolean },
  ): Promise<PermissionRow> {
    const row = await this.prisma.rolePermission.upsert({
      where:  { role_module: { role, module } },
      create: { role, module, ...flags },
      update: flags,
    }) as PermissionRow;

    this.cache.delete(role);
    return row;
  }

  /** Create default permission rows (all read-only) for a brand-new role. */
  async initRolePermissions(role: string): Promise<void> {
    for (const module of ALL_MODULES) {
      await this.prisma.rolePermission.upsert({
        where:  { role_module: { role, module } },
        create: { role, module, canCreate: false, canRead: true, canUpdate: false, canDelete: false },
        update: {},   // don't overwrite if rows already exist
      });
    }
    this.cache.delete(role);
  }

  /** Delete all permission rows for a role (called when the role itself is deleted). */
  async deleteRolePermissions(role: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({ where: { role } });
    this.cache.delete(role);
  }

  // ── Guard helper ─────────────────────────────────────────────────────────────

  async can(role: string, module: string, action: CrudAction): Promise<boolean> {
    if (role === 'ADMIN') return true;
    const rows = await this.getForRole(role);
    const row  = rows.find(r => r.module === module);
    if (!row) return false;

    const key = `can${action.charAt(0).toUpperCase() + action.slice(1)}` as keyof PermissionRow;
    return row[key] as boolean;
  }

  // ── Seed ─────────────────────────────────────────────────────────────────────

  private async seedDefaults() {
    for (const d of DEFAULTS) {
      await this.prisma.rolePermission.upsert({
        where:  { role_module: { role: d.role, module: d.module } },
        create: d,
        update: {},   // never overwrite admin-changed settings on restart
      });
    }
  }
}
