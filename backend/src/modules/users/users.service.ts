import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const SAFE_SELECT = {
  id: true, email: true, name: true, role: true, isActive: true, createdAt: true, updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /** Find user by email — includes hashed password (used for login validation). */
  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** Find user by ID — never returns the password hash. */
  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: SAFE_SELECT });
  }

  /** List all users (no password hashes). */
  findAll() {
    return this.prisma.user.findMany({
      select: SAFE_SELECT,
      orderBy: { name: 'asc' },
    });
  }

  /** Create a new user with a bcrypt-hashed password. */
  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException(`Email ${dto.email} is already in use`);
    const hashed = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { email: dto.email, name: dto.name, role: dto.role, password: hashed },
      select: SAFE_SELECT,
    });
  }

  /** Update name / role / isActive. Never touches the password. */
  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return this.prisma.user.update({ where: { id }, data: dto, select: SAFE_SELECT });
  }

  /**
   * Hard-delete a user.
   * Guards:
   *  1. Cannot delete yourself.
   *  2. Cannot delete the last active ADMIN.
   */
  async deleteUser(id: string, requesterId: string): Promise<void> {
    if (id === requesterId) {
      throw new ForbiddenException('You cannot delete your own account.');
    }

    const target = await this.prisma.user.findUnique({ where: { id } });
    if (!target) throw new NotFoundException(`User ${id} not found`);

    if (target.role === 'ADMIN' && target.isActive) {
      const activeAdminCount = await this.prisma.user.count({
        where: { role: 'ADMIN', isActive: true },
      });
      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot delete the last active ADMIN account. Create another ADMIN first.',
        );
      }
    }

    await this.prisma.user.delete({ where: { id } });
  }
}
