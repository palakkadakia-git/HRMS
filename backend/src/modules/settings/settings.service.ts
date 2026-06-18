import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Returns singleton settings, creating defaults if not yet seeded. */
  async getSettings() {
    const existing = await this.prisma.companySettings.findUnique({ where: { id: 'singleton' } });
    if (existing) return existing;
    return this.prisma.companySettings.create({ data: { id: 'singleton' } });
  }

  async updateSettings(dto: UpdateSettingsDto) {
    return this.prisma.companySettings.upsert({
      where:  { id: 'singleton' },
      create: { id: 'singleton', ...dto },
      update: dto,
    });
  }

  async uploadLogo(file: Express.Multer.File): Promise<{ logoPath: string }> {
    const dir = path.join(process.cwd(), 'uploads', 'company');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Remove any old logo files first
    const oldSettings = await this.prisma.companySettings.findUnique({ where: { id: 'singleton' } });
    if (oldSettings?.logoPath) {
      const oldFile = path.join(process.cwd(), oldSettings.logoPath);
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }

    // Save with original extension
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const filename = `logo${ext}`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, file.buffer);

    // logoPath stored as the public URL path (relative to uploads root)
    const logoPath = `uploads/company/${filename}`;

    await this.prisma.companySettings.upsert({
      where:  { id: 'singleton' },
      create: { id: 'singleton', logoPath },
      update: { logoPath },
    });

    return { logoPath };
  }
}
