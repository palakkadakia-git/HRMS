import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { DependentsModule } from './modules/dependents/dependents.module';
import { SalaryRevisionsModule } from './modules/salary-revisions/salary-revisions.module';
import { SitesModule } from './modules/sites/sites.module';
import { DesignationMasterModule } from './modules/designation-master/designation-master.module';
import { KioskModule } from './modules/kiosk/kiosk.module';
import { AttendanceLogModule } from './modules/attendance-log/attendance-log.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { EmployeeSitesModule } from './modules/employee-sites/employee-sites.module';
import { SettingsModule } from './modules/settings/settings.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { RolesModule } from './modules/roles/roles.module';
import { MinimumWagesModule } from './modules/minimum-wages/minimum-wages.module';
import { AdvancesModule } from './modules/advances/advances.module';
import { ReportsModule } from './modules/reports/reports.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/permissions/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Serve uploaded files at /uploads/* (e.g. /uploads/employees/:id/photo/file.jpg)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { index: false },
    }),

    PrismaModule,
    AuthModule,
    PermissionsModule,   // Global — must be before modules that use @RequirePermission
    UsersModule,
    EmployeesModule,
    DependentsModule,
    SalaryRevisionsModule,
    SitesModule,
    DesignationMasterModule,
    KioskModule,
    AttendanceLogModule,
    AttendanceModule,
    PayrollModule,
    EmployeeSitesModule,
    SettingsModule,
    RolesModule,
    MinimumWagesModule,
    AdvancesModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },   // runs after JWT auth
  ],
})
export class AppModule {}
