import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param,
  Query, UploadedFile, UseInterceptors, Res, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Response } from 'express';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto, UpdateStatusDto } from './dto/update-employee.dto';
import { QueryEmployeeDto } from './dto/query-employee.dto';
import { SetFaceDescriptorDto } from './dto/set-face-descriptor.dto';

// Valid document types
const VALID_DOC_TYPES = ['photo', 'aadhaarDoc', 'panDoc', 'bankPassbook'];

/** Multer disk storage factory — stores to uploads/employees/:id/:docType/ */
function employeeStorage(docType: string) {
  return diskStorage({
    destination: (req, _file, cb) => {
      const dir = join(process.cwd(), 'uploads', 'employees', req.params['id'] as string, docType);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  });
}

@Controller('employees')
export class EmployeesController {
  constructor(private employeesService: EmployeesService) {}

  // ── List ──────────────────────────────────────────────────
  @Get()
  findAll(@Query() query: QueryEmployeeDto) {
    return this.employeesService.findAll(query);
  }

  // ── Excel template download ────────────────────────────────
  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.employeesService.generateExcelTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="employee-bulk-upload-template.xlsx"',
    });
    res.send(buffer);
  }

  // ── Single employee ────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  // ── Create ─────────────────────────────────────────────────
  @Post()
  @RequirePermission('employees', 'create')
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  // ── Bulk upload ────────────────────────────────────────────
  @Post('bulk')
  @RequirePermission('employees', 'create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({ destination: join(process.cwd(), 'uploads', 'tmp') }),
      fileFilter: (_req, file, cb) => {
        const allowed = ['.xlsx', '.xls'];
        if (allowed.includes(extname(file.originalname).toLowerCase())) {
          cb(null, true);
        } else {
          cb(new Error('Only .xlsx and .xls files are allowed'), false);
        }
      },
    }),
  )
  async bulkCreate(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file uploaded');
    const fs = await import('fs');
    const buffer = fs.readFileSync(file.path);
    fs.unlinkSync(file.path); // clean up tmp file
    return this.employeesService.bulkCreate(buffer);
  }

  // ── Update ─────────────────────────────────────────────────
  @Put(':id')
  @RequirePermission('employees', 'update')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  // ── Change status ──────────────────────────────────────────
  @Patch(':id/status')
  @RequirePermission('employees', 'update')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.employeesService.updateStatus(id, dto);
  }

  // ── Face biometric descriptor ──────────────────────────────
  @Patch(':id/face-descriptor')
  @RequirePermission('employees', 'update')
  async setFaceDescriptor(@Param('id') id: string, @Body() dto: SetFaceDescriptorDto) {
    await this.employeesService.setFaceDescriptor(id, dto.descriptor);
    return { message: 'Face descriptor saved' };
  }

  // ── Document upload ────────────────────────────────────────
  @Post(':id/documents/:docType')
  @RequirePermission('employees', 'update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
        if (allowed.includes(extname(file.originalname).toLowerCase())) {
          cb(null, true);
        } else {
          cb(new Error('Only JPG, PNG, and PDF files are allowed'), false);
        }
      },
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const docType = req.params['docType'] as string;
          if (!VALID_DOC_TYPES.includes(docType)) {
            return cb(new Error('Invalid document type'), '');
          }
          const dir = join(process.cwd(), 'uploads', 'employees', req.params['id'] as string, docType);
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}${extname(file.originalname)}`;
          cb(null, unique);
        },
      }),
    }),
  )
  async uploadDocument(
    @Param('id') id: string,
    @Param('docType') docType: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new Error('No file uploaded');
    const relativePath = `/uploads/employees/${id}/${docType}/${file.filename}`;
    return this.employeesService.updateDocumentPath(id, docType, relativePath);
  }

  // ── Delete ─────────────────────────────────────────────────
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('employees', 'delete')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }
}
