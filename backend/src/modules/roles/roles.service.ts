import {
  Injectable, OnModuleInit, ConflictException,
  NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

const SYSTEM_ROLES = ['ADMIN', 'HR', 'ACCOUNTS'];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private permissions: PermissionsService,
  ) {}

  async onModuleInit() {
    // Seed system roles
    for (const [name, label] of [
      ['ADMIN',    'Admin'],
      ['HR',       'HR'],
      ['ACCOUNTS', 'Accounts'],
    ]) {
      await this.prisma.role.upsert({
        where:  { name },
        create: { name, label, isSystem: true },
        update: { label, isSystem: true },
      });
    }
  }

  findAll() {
    return this.prisma.role.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string, label: string) {
    const upper = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!upper || !/^[A-Z0-9_]+$/.test(upper)) {
      throw new BadRequestException('Role name must be letters, digits, or underscores only.');
    }
    const exists = await this.prisma.role.findUnique({ where: { name: upper } });
    if (exists) throw new ConflictException(`Role "${upper}" already exists.`);

    const role = await this.prisma.role.create({
      data: { name: upper, label: label.trim() || upper, isSystem: false },
    });

    // Auto-initialise all-module permission entries (read-only by default)
    await this.permissions.initRolePermissions(upper);
    return role;
  }

  async delete(name: string) {
    const role = await this.prisma.role.findUnique({ where: { name } });
    if (!role) throw new NotFoundException(`Role "${name}" not found.`);
    if (role.isSystem) throw new BadRequestException(`System role "${name}" cannot be deleted.`);

    const userCount = await this.prisma.user.count({ where: { role: name } });
    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${name}" — ${userCount} user(s) still assigned. Re-assign them first.`,
      );
    }

    await this.permissions.deleteRolePermissions(name);
    await this.prisma.role.delete({ where: { name } });
  }
}
