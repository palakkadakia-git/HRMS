import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDesignationDto, UpdateDesignationDto, SkillLevel } from './dto/designation.dto';
import * as XLSX from 'xlsx';

const VALID_SKILL_LEVELS = new Set<string>(Object.values(SkillLevel));

@Injectable()
export class DesignationMasterService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.designationMaster.findMany({
      orderBy: [{ skillLevel: 'asc' }, { designation: 'asc' }],
    });
  }

  async create(dto: CreateDesignationDto) {
    const exists = await this.prisma.designationMaster.findUnique({
      where: { designation: dto.designation },
    });
    if (exists) throw new ConflictException(`Designation "${dto.designation}" already exists`);
    return this.prisma.designationMaster.create({ data: dto });
  }

  async update(id: string, dto: UpdateDesignationDto) {
    await this.findOrFail(id);
    // Check uniqueness only if name is changing
    const conflict = await this.prisma.designationMaster.findFirst({
      where: { designation: dto.designation, NOT: { id } },
    });
    if (conflict) throw new ConflictException(`Designation "${dto.designation}" already exists`);
    return this.prisma.designationMaster.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    await this.prisma.designationMaster.delete({ where: { id } });
    return { message: 'Designation deleted.' };
  }

  // ── Excel template ──────────────────────────────────────────────────────────

  generateTemplate(): Buffer {
    const headers = ['Designation', 'Skill Level'];
    const examples = [
      ['Electrician',       'SKILLED'     ],
      ['Helper',            'UNSKILLED'   ],
      ['Supervisor',        'SEMI_SKILLED'],
      ['HR Manager',        'STAFF'       ],
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);
    ws['!cols'] = [{ wch: 30 }, { wch: 20 }];

    // Add a note sheet explaining valid values
    const noteSheet = XLSX.utils.aoa_to_sheet([
      ['Valid Skill Level values:'],
      ['SKILLED'],
      ['SEMI_SKILLED'],
      ['UNSKILLED'],
      ['STAFF'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Designations');
    XLSX.utils.book_append_sheet(wb, noteSheet, 'Reference');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ── Bulk upload ─────────────────────────────────────────────────────────────

  async bulkUpload(fileBuffer: Buffer): Promise<{
    total: number;
    created: number;
    skipped: number;
    errors: { row: number; designation: string; error: string }[];
  }> {
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch {
      throw new BadRequestException('Could not parse the uploaded file. Ensure it is a valid .xlsx or .xls file.');
    }

    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) throw new BadRequestException('The uploaded file is empty.');

    const errors: { row: number; designation: string; error: string }[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNum   = i + 2; // 1-indexed, row 1 = header
      const rawName  = String(rows[i]['Designation'] ?? '').trim();
      const rawSkill = String(rows[i]['Skill Level'] ?? '').trim().toUpperCase().replace(/[- ]/g, '_');

      if (!rawName) {
        errors.push({ row: rowNum, designation: '(empty)', error: 'Designation name is required.' });
        continue;
      }

      if (!VALID_SKILL_LEVELS.has(rawSkill)) {
        errors.push({
          row: rowNum,
          designation: rawName,
          error: `Invalid Skill Level "${rows[i]['Skill Level']}". Must be one of: SKILLED, SEMI_SKILLED, UNSKILLED, STAFF.`,
        });
        continue;
      }

      try {
        await this.prisma.designationMaster.upsert({
          where:  { designation: rawName },
          create: { designation: rawName, skillLevel: rawSkill as any },
          update: { skillLevel: rawSkill as any },           // update skill level if name exists
        });
        // Distinguish created vs updated by checking if it already existed
        // Use upsert's implicit behaviour: we count all successes as created for simplicity
        created++;
      } catch (e: any) {
        errors.push({ row: rowNum, designation: rawName, error: e.message ?? 'Database error.' });
      }
    }

    // skipped = rows with errors
    skipped = errors.length;

    return { total: rows.length, created, skipped, errors };
  }

  // ── private ─────────────────────────────────────────────────────────────────

  private async findOrFail(id: string) {
    const row = await this.prisma.designationMaster.findUnique({ where: { id } });
    if (!row) throw new NotFoundException(`Designation ${id} not found`);
    return row;
  }
}
