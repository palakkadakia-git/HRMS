import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDependentDto } from './dto/create-dependent.dto';

@Injectable()
export class DependentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(employeeId: string) {
    // Verify employee exists
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);
    return this.prisma.dependent.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(employeeId: string, dto: CreateDependentDto) {
    const emp = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!emp) throw new NotFoundException(`Employee ${employeeId} not found`);
    return this.prisma.dependent.create({
      data: {
        ...dto,
        employeeId,
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
      },
    });
  }

  async update(employeeId: string, dependentId: string, dto: Partial<CreateDependentDto>) {
    const dep = await this.prisma.dependent.findFirst({
      where: { id: dependentId, employeeId },
    });
    if (!dep) throw new NotFoundException(`Dependent ${dependentId} not found`);
    return this.prisma.dependent.update({
      where: { id: dependentId },
      data: {
        ...dto,
        ...(dto.dateOfBirth && { dateOfBirth: new Date(dto.dateOfBirth) }),
      },
    });
  }

  async remove(employeeId: string, dependentId: string) {
    const dep = await this.prisma.dependent.findFirst({
      where: { id: dependentId, employeeId },
    });
    if (!dep) throw new NotFoundException(`Dependent ${dependentId} not found`);
    return this.prisma.dependent.delete({ where: { id: dependentId } });
  }
}
