import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto, UpdateStatusDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class EmployeesService {
  constructor(private prisma: PrismaService) {}

  // ── Code generation ─────────────────────────────────────

  async generateEmployeeCode(): Promise<string> {
    const last = await this.prisma.employee.findFirst({
      orderBy: { employeeCode: 'desc' },
      select: { employeeCode: true },
    });
    if (!last) return 'EMP001';
    const match = last.employeeCode.match(/(\d+)$/);
    const num = match ? parseInt(match[1]) + 1 : 1;
    return `EMP${String(num).padStart(3, '0')}`;
  }

  // ── CRUD ────────────────────────────────────────────────

  async findAll(query: QueryEmployeeDto) {
    const { search, status, type, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {
      ...(search && {
        OR: [
          { firstName:    { contains: search, mode: 'insensitive' } },
          { lastName:     { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
          { designation:  { contains: search, mode: 'insensitive' } },
          { panNumber:    { contains: search, mode: 'insensitive' } },
          { aadhaarNumber:{ contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
      ...(type   && { type   }),
    };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          dependents: true,
          siteAssignments: { include: { site: { select: { id: true, name: true, city: true, state: true, esiApplicable: true } } }, orderBy: { isPrimary: 'desc' } },
          shift: { select: { id: true, name: true, shiftHours: true } },
          salaryRevisions: { where: { effectiveTo: null }, orderBy: { effectiveFrom: 'desc' }, take: 1 },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        dependents: true,
        siteAssignments: { include: { site: { select: { id: true, name: true, city: true, state: true, esiApplicable: true } } }, orderBy: { isPrimary: 'desc' } },
        shift: { select: { id: true, name: true, shiftHours: true } },
        salaryRevisions: { orderBy: { effectiveFrom: 'desc' } },
      },
    });
    if (!employee) throw new NotFoundException(`Employee ${id} not found`);
    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    const code = await this.generateEmployeeCode();
    try {
      return await this.prisma.employee.create({
        data: { ...this.sanitizeDto(dto as any), employeeCode: code } as any,
        include: {
          dependents: true,
          siteAssignments: { include: { site: { select: { id: true, name: true, city: true, state: true } } } },
          salaryRevisions: { orderBy: { effectiveFrom: 'desc' } },
        },
      });
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    try {
      return await this.prisma.employee.update({
        where: { id },
        data: this.sanitizeDto(dto as any),
        include: {
          dependents: true,
          siteAssignments: { include: { site: { select: { id: true, name: true, city: true, state: true } } } },
          salaryRevisions: { orderBy: { effectiveFrom: 'desc' } },
        },
      });
    } catch (e) {
      this.handlePrismaError(e);
    }
  }

  async updateStatus(id: string, dto: UpdateStatusDto) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.dateOfExit && { dateOfExit: new Date(dto.dateOfExit) }),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.employee.delete({ where: { id } });
  }

  // ── Document uploads ────────────────────────────────────

  readonly DOC_FIELD_MAP: Record<string, string> = {
    photo:       'photoPath',
    aadhaarDoc:  'aadhaarDocPath',
    panDoc:      'panDocPath',
    bankPassbook:'bankPassbookPath',
  };

  async updateDocumentPath(id: string, docType: string, relativePath: string) {
    const field = this.DOC_FIELD_MAP[docType];
    if (!field) throw new BadRequestException(`Unknown document type: ${docType}`);
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: { [field]: relativePath },
    });
  }

  // ── Bulk upload ─────────────────────────────────────────

  async bulkCreate(buffer: Buffer) {
    const workbook  = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows.length) throw new BadRequestException('Excel file is empty');

    const success: any[] = [];
    const errors: { row: number; data: any; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const code = await this.generateEmployeeCode();
        const dto  = this.mapRowToDto(row);
        const emp  = await this.prisma.employee.create({
          data: { ...dto, employeeCode: code } as any,
        });
        success.push({ row: i + 2, employeeCode: emp.employeeCode, name: `${emp.firstName} ${emp.lastName}` });
      } catch (e) {
        errors.push({ row: i + 2, data: row, error: e?.message ?? String(e) });
      }
    }

    return { total: rows.length, success: success.length, failed: errors.length, errors };
  }

  private mapRowToDto(row: any): Partial<CreateEmployeeDto> {
    const toDate = (v: any) => v ? (v instanceof Date ? v.toISOString().split('T')[0] : v) : undefined;
    return {
      firstName:     row['First Name']    || row['firstName'],
      lastName:      row['Last Name']     || row['lastName'],
      sex:           row['Sex']           || row['sex']           || 'MALE',
      dateOfBirth:   toDate(row['Date of Birth'] || row['dateOfBirth']),
      bloodGroup:    row['Blood Group']   || row['bloodGroup'],
      fathersName:   row["Father's Name"] || row['fathersName'],
      designation:   row['Designation']   || row['designation'],
      type:          row['Type']          || row['type']          || 'ON_ROLLS',
      status:        row['Status']        || row['status']        || 'PROBATION',
      dateOfJoining: toDate(row['Date of Joining'] || row['dateOfJoining']),
      addressLine1:  row['Address Line 1']|| row['addressLine1'],
      addressLine2:  row['Address Line 2']|| row['addressLine2'],
      area:          row['Area']          || row['area'],
      city:          row['City']          || row['city'],
      stateName:     row['State']         || row['stateName'],
      country:       row['Country']       || row['country'] || 'India',
      pincode:       String(row['Pin Code'] || row['pincode'] || ''),
      aadhaarNumber: String(row['Aadhaar Number'] || row['aadhaarNumber'] || ''),
      panNumber:     row['PAN Number']    || row['panNumber'],
      epfNumber:     row['EPF Number']    || row['epfNumber'],
      uanNumber:     String(row['UAN Number'] || row['uanNumber'] || ''),
      esiNumber:     String(row['ESI Number'] || row['esiNumber'] || ''),
      bankAccount:   String(row['Bank Account'] || row['bankAccount'] || ''),
      ifsc:          row['IFSC Code']     || row['ifsc'],
      bankName:      row['Bank Name']     || row['bankName'],
    };
  }

  // ── Excel template ──────────────────────────────────────

  generateExcelTemplate(): Buffer {
    const headers = [
      'First Name', 'Last Name', 'Sex', 'Date of Birth', 'Blood Group', "Father's Name",
      'Designation', 'Type', 'Status', 'Date of Joining',
      'Address Line 1', 'Address Line 2', 'Area', 'City', 'State', 'Country', 'Pin Code',
      'Aadhaar Number', 'PAN Number', 'EPF Number', 'UAN Number', 'ESI Number',
      'Bank Account', 'IFSC Code', 'Bank Name',
    ];

    const example = [
      'Raj', 'Kumar', 'MALE', '1990-05-15', 'B_POS', 'Ram Kumar',
      'Manager', 'ON_ROLLS', 'ACTIVE', '2024-01-01',
      '123, Street Name', 'Near Landmark', 'Area Name', 'Mumbai', 'Maharashtra', 'India', '400001',
      '123456789012', 'ABCDE1234F', 'MH/BOM/12345/001', '100123456789', '',
      '12345678901', 'HDFC0001234', 'HDFC Bank',
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);

    // Column widths
    ws['!cols'] = headers.map(() => ({ wch: 20 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // ── Face biometric ────────────────────────────────────────

  async setFaceDescriptor(id: string, descriptor: string): Promise<void> {
    await this.findOne(id); // throws 404 if not found
    await this.prisma.employee.update({
      where: { id },
      data: { faceDescriptor: descriptor },
    });
  }

  // ── DTO sanitization ────────────────────────────────────
  // PostgreSQL treats '' (empty string) as a concrete UNIQUE value — multiple empty
  // strings in a UNIQUE column cause a P2002 conflict.  Convert '' → null for any
  // optional unique field so PostgreSQL's "multiple NULLs are allowed" rule applies.
  // For non-unique optional fields, '' is a valid value and is left as-is.

  private sanitizeDto(dto: Record<string, any>): Record<string, any> {
    // Unique nullable string fields: '' must become null so PostgreSQL's
    // "multiple NULLs are allowed in a UNIQUE column" rule applies.
    const UNIQUE_NULLABLE = ['aadhaarNumber', 'panNumber', 'epfNumber', 'uanNumber', 'esiNumber'];

    // DateTime fields: the HTML date input produces "YYYY-MM-DD" strings but
    // Prisma requires a full ISO-8601 DateTime or a JS Date object.
    // Convert '' / null / undefined → null; any date string → Date object.
    const DATE_FIELDS = ['dateOfBirth', 'dateOfJoining', 'dateOfExit'];

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (DATE_FIELDS.includes(key)) {
        if (!value) {
          result[key] = null;
        } else if (value instanceof Date) {
          result[key] = value;
        } else {
          const d = new Date(value as string);
          result[key] = isNaN(d.getTime()) ? null : d;
        }
      } else if (UNIQUE_NULLABLE.includes(key) && value === '') {
        result[key] = null;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  // ── Error handling ──────────────────────────────────────

  private handlePrismaError(e: any): never {
    // P2002 — unique constraint (e.g. duplicate aadhaarNumber)
    if (e?.code === 'P2002') {
      const field = e?.meta?.target?.[0] || 'field';
      throw new ConflictException(`${field} already exists`);
    }
    // P2003 — foreign-key constraint (e.g. siteId doesn't exist)
    if (e?.code === 'P2003') {
      const field = e?.meta?.field_name ?? 'related record';
      throw new BadRequestException(`Foreign key violation — ${field} not found`);
    }
    // P2025 — record not found during update/delete
    if (e?.code === 'P2025') {
      throw new NotFoundException(e?.meta?.cause ?? 'Record not found');
    }
    // Unknown — log so it appears in the backend terminal, then surface a readable message
    console.error('[DB Error]', e?.code, e?.message, e?.meta);
    throw new BadRequestException(e?.message ?? 'Database operation failed');
  }
}
