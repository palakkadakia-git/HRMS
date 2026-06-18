// ── Auth ──────────────────────────────────────────────────
export type UserRole = string;   // Dynamic: 'ADMIN' | 'HR' | 'ACCOUNTS' | any custom role
export interface User { id: string; email: string; name: string; role: UserRole; isActive: boolean; createdAt: string; }
export interface AuthResponse { accessToken: string; user: Pick<User, 'id' | 'email' | 'name' | 'role'>; }

// ── Roles ──────────────────────────────────────────────────
export interface Role { id: string; name: string; label: string; isSystem: boolean; createdAt: string; }

// ── Enums ─────────────────────────────────────────────────
export type Sex          = 'MALE' | 'FEMALE' | 'OTHER';
export type BloodGroup   = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'O_POS' | 'O_NEG' | 'AB_POS' | 'AB_NEG';
export type EmpType      = 'INTERN' | 'ON_ROLLS' | 'ON_CONTRACT';
export type EmpStatus    = 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'INACTIVE';
export type TaxRegime    = 'NEW' | 'OLD';
export type Relationship = 'SPOUSE' | 'CHILD' | 'PARENT' | 'SIBLING' | 'OTHER';
export type SkillLevel   = 'SKILLED' | 'SEMI_SKILLED' | 'UNSKILLED' | 'STAFF';
export type HolidayType  = 'NATIONAL' | 'FESTIVAL' | 'OPTIONAL';
export type LeaveType    = 'PL' | 'CL' | 'SL' | 'LWP';

// ── Shift ─────────────────────────────────────────────────
export interface Shift {
  id: string;
  name: string;
  shiftHours: number;
  createdAt: string;
  updatedAt: string;
}

// ── Holiday ───────────────────────────────────────────────
export interface Holiday {
  id: string;
  name: string;
  date: string;           // ISO date
  type: HolidayType;
  year: number;
  siteId?: string | null; // null = all sites
  site?: Pick<Site, 'id' | 'name'> | null;
  createdAt: string;
}

// ── Leave ─────────────────────────────────────────────────
export interface LeaveRecord {
  id: string;
  employeeId: string;
  date: string;
  leaveType: LeaveType;
  days: number;
  remarks?: string | null;
  createdAt: string;
  employee?: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>;
}

export interface LeaveBalance {
  year: number;
  plAccrued:   number;
  clAllocated: number;
  slAllocated: number;
  plAvailable: number;
  clAvailable: number;
  slAvailable: number;
  lwpDays:     number;
}

export interface EmployeeLeaveBalance {
  employee: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName' | 'designation' | 'dateOfJoining'>;
  balance: LeaveBalance;
}

// ── Monthly Attendance ────────────────────────────────────
export interface MonthlyAttendance {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  lopDays: number;
  otHours: number;
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation?: string;
    shift?: Pick<Shift, 'name' | 'shiftHours'> | null;
  };
}

// ── Site ──────────────────────────────────────────────────
export interface Site {
  id: string;
  name: string;
  city?: string;
  state?: string;
  isActive: boolean;
  esiApplicable: boolean;   // false = ESI not deducted for employees at this site
  createdAt: string;
  updatedAt: string;
}

// ── Designation Master ─────────────────────────────────────
export interface DesignationMaster {
  id: string;
  designation: string;
  skillLevel: SkillLevel;
  createdAt: string;
  updatedAt: string;
}

// ── Minimum Wage ───────────────────────────────────────────
export interface MinimumWage {
  id: string;
  siteId: string;
  skillLevel: SkillLevel;
  monthlyWage: number;
  effectiveFrom: string;
  effectiveTo?: string | null;
  createdAt: string;
  site?: Pick<Site, 'id' | 'name' | 'city'>;
}

export interface CreateMinimumWageDto {
  siteId: string;
  skillLevel: SkillLevel;
  monthlyWage: number;
  effectiveFrom: string;
}

// ── Salary Revision ────────────────────────────────────────
export interface SalaryRevision {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  grossSalary: number;
  basic: number;
  hra: number;
  medical: number;
  conveyance: number;
  bonus: number;
  leaveAllowance: number;
  otherAllowance: number;
  otMultiplier: number;     // OT rate multiplier (default 1.5)
  remarks?: string | null;
  createdAt: string;
}

export interface SalaryComponents {
  grossSalary: number;
  basic: number;
  hra: number;
  medical: number;
  conveyance: number;
  bonus: number;
  leaveAllowance: number;
  otherAllowance: number;
}

export interface CreateSalaryRevisionDto {
  effectiveFrom: string;
  grossSalary: number;
  otMultiplier?: number;
  remarks?: string;
}

// ── Employee Site Assignment ───────────────────────────────
export interface EmployeeSite {
  id: string;
  employeeId: string;
  siteId: string;
  isPrimary: boolean;
  startDate?: string | null;
  createdAt: string;
  site?: Pick<Site, 'id' | 'name' | 'city' | 'state' | 'esiApplicable'>;
  employee?: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName'>;
}

// ── Employee ──────────────────────────────────────────────
export interface Employee {
  id: string;
  employeeCode: string;
  // Personal
  firstName: string;
  lastName: string;
  sex: Sex;
  dateOfBirth?: string;
  bloodGroup?: BloodGroup;
  fathersName?: string;
  // Address
  addressLine1?: string;
  addressLine2?: string;
  area?: string;
  city?: string;
  stateName?: string;
  country?: string;
  pincode?: string;
  // Employment
  designation?: string;
  type: EmpType;
  status: EmpStatus;
  dateOfJoining?: string;
  dateOfExit?: string;
  isBlacklisted: boolean;
  // Statutory
  aadhaarNumber?: string;
  panNumber?: string;
  epfNumber?: string;
  uanNumber?: string;
  esiNumber?: string;
  taxRegime: TaxRegime;
  ptState: string;
  pfExempt: boolean;
  // Bank
  bankAccount?: string;
  ifsc?: string;
  bankName?: string;
  // Documents
  photoPath?: string;
  aadhaarDocPath?: string;
  panDocPath?: string;
  bankPassbookPath?: string;
  // Shift
  shiftId?: string | null;
  shift?: Pick<Shift, 'id' | 'name' | 'shiftHours'> | null;
  // Biometric
  faceDescriptor?: string | null; // JSON-serialised number[128]
  // Relations (populated by API)
  dependents?: Dependent[];
  siteAssignments?: EmployeeSite[];
  salaryRevisions?: SalaryRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResponse {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type CreateEmployeeDto = Omit<Employee, 'id' | 'employeeCode' | 'dependents' | 'siteAssignments' | 'salaryRevisions' | 'createdAt' | 'updatedAt'>;
export type UpdateEmployeeDto = Partial<CreateEmployeeDto>;

// ── Dependent ─────────────────────────────────────────────
export interface Dependent {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  sex: Sex;
  relationship: Relationship;
  dateOfBirth?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateDependentDto = Omit<Dependent, 'id' | 'employeeId' | 'createdAt' | 'updatedAt'>;

// ── Attendance ────────────────────────────────────────────
export type PunchSource = 'KIOSK' | 'WEB' | 'MANUAL';
export type DayStatus   = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY' | 'WEEKEND' | 'LEAVE';

export interface AttendanceLog {
  id: string;
  employeeId: string;
  siteId?: string | null;
  date: string;           // ISO date string (date only)
  punchIn?: string | null;
  punchOut?: string | null;
  lat?: number | null;
  lng?: number | null;
  onSite: boolean;
  source: PunchSource;
  status: DayStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  employee?: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName' | 'designation'>;
  site?: Pick<Site, 'id' | 'name' | 'city'> | null;
}

// ── Attendance Site Summary ───────────────────────────────
export interface AttendanceSiteSummary {
  id: string;
  employeeId: string;
  siteId?: string | null;
  month: number;
  year: number;
  presentDays: number;
  otHours: number;
  createdAt: string;
  updatedAt: string;
  employee?: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName' | 'designation'>;
  site?: Pick<Site, 'id' | 'name' | 'city'> | null;
}

// Kiosk
export interface KioskEmployee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  photoPath?: string | null;
  faceDescriptor?: string | null; // JSON string of number[]
  todayLog: Pick<AttendanceLog, 'punchIn' | 'punchOut' | 'status'> | null;
}

export interface KioskSite {
  id: string;
  name: string;
  city?: string | null;
  geofenceRadius: number;
}

// ── Payroll ───────────────────────────────────────────────
export type PayrollStatus = 'DRAFT' | 'PROCESSED' | 'APPROVED' | 'PAID';

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: PayrollStatus;
  runAt: string;
  _count?: { payslips: number };
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  // Attendance
  workingDays: number;
  presentDays: number;
  lopDays: number;
  otHours: number;
  // Earnings
  basic: number;
  hra: number;
  medical: number;
  conveyance: number;
  bonus: number;
  leaveAllowance: number;
  otherAllowance: number;
  otPay: number;
  gross: number;
  // Deductions
  empPF: number;
  empESI: number;
  pt: number;
  tds: number;
  penaltyDeduction: number;
  advanceDeduction: number;
  totalDed: number;
  // Employer costs
  emplPF: number;
  emplESI: number;
  edli: number;
  epfAdmin: number;
  // Net
  net: number;
  createdAt: string;
  // Relations (populated when requested)
  employee?: Pick<Employee, 'id' | 'employeeCode' | 'firstName' | 'lastName' | 'designation' |
    'pfExempt' | 'ptState' | 'bankAccount' | 'bankName' | 'ifsc' |
    'epfNumber' | 'uanNumber' | 'esiNumber' | 'panNumber'> & {
    site?: Pick<Site, 'name' | 'city' | 'esiApplicable'> | null;
  };
  payrollRun?: PayrollRun;
}

export interface PayrollSummary {
  count: number;
  totalGross: number;
  totalEmpPF: number;
  totalEmpESI: number;
  totalPT: number;
  totalTDS: number;
  totalPenalty: number;
  totalAdvance: number;
  totalDeductions: number;
  totalNet: number;
  totalEmplPF: number;
  totalEmplESI: number;
  totalEdli: number;
  totalEpfAdmin: number;
}

// ── Company Settings ──────────────────────────────────────
export interface CompanySettings {
  id: string;
  companyName: string;
  address: string;
  cin: string;
  tan: string;
  pan: string;
  state: string;
  pfCeiling: number;
  esiCeiling: number;
  logoPath?: string | null;
  updatedAt: string;
}

// ── Lookups ───────────────────────────────────────────────
export const SEX_OPTIONS:      { value: Sex;          label: string }[] = [{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }];
export const BLOOD_OPTIONS:    { value: BloodGroup;   label: string }[] = [{ value: 'A_POS', label: 'A+' }, { value: 'A_NEG', label: 'A-' }, { value: 'B_POS', label: 'B+' }, { value: 'B_NEG', label: 'B-' }, { value: 'O_POS', label: 'O+' }, { value: 'O_NEG', label: 'O-' }, { value: 'AB_POS', label: 'AB+' }, { value: 'AB_NEG', label: 'AB-' }];
export const TYPE_OPTIONS:     { value: EmpType;      label: string }[] = [{ value: 'INTERN', label: 'Intern' }, { value: 'ON_ROLLS', label: 'On Rolls' }, { value: 'ON_CONTRACT', label: 'On Contract' }];
export const STATUS_OPTIONS:   { value: EmpStatus;    label: string }[] = [{ value: 'ACTIVE', label: 'Active' }, { value: 'PROBATION', label: 'Probation' }, { value: 'NOTICE_PERIOD', label: 'Notice Period' }, { value: 'INACTIVE', label: 'Inactive' }];
export const RELATION_OPTIONS: { value: Relationship; label: string }[] = [{ value: 'SPOUSE', label: 'Spouse' }, { value: 'CHILD', label: 'Child' }, { value: 'PARENT', label: 'Parent' }, { value: 'SIBLING', label: 'Sibling' }, { value: 'OTHER', label: 'Other' }];
export const PT_STATES = [{ value: 'MH', label: 'Maharashtra' }, { value: 'KA', label: 'Karnataka' }, { value: 'WB', label: 'West Bengal' }, { value: 'TN', label: 'Tamil Nadu' }, { value: 'OTHER', label: 'Other (No PT)' }];
export const TAX_REGIMES = [{ value: 'NEW', label: 'New Regime' }, { value: 'OLD', label: 'Old Regime' }];
