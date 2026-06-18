import type { Metadata } from 'next';
import Header from '@/components/layout/Header';

export const metadata: Metadata = { title: 'Dashboard' };

const STATS = [
  { label: 'Total Employees', value: '—', icon: '👥', sub: 'Loading…' },
  { label: 'Monthly Payroll', value: '—', icon: '💰', sub: 'Gross CTC' },
  { label: 'Payroll Runs',    value: '—', icon: '📊', sub: 'All time' },
  { label: 'Last Run',        value: '—', icon: '📅', sub: '—' },
];

const QUICK_LINKS = [
  { href: '/employees',  icon: '👥', label: 'Add Employee',   desc: 'Register a new employee' },
  { href: '/attendance', icon: '📅', label: 'Mark Attendance', desc: 'Enter monthly attendance' },
  { href: '/payroll',    icon: '💰', label: 'Run Payroll',     desc: "Process this month's salaries" },
  { href: '/reports',    icon: '📈', label: 'View Reports',    desc: 'PF / ESI / TDS compliance' },
];

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" subtitle="Welcome to HRMS" />

      <main className="flex-1 p-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="card p-5">
              <div className="text-2xl mb-3">{s.icon}</div>
              <div className="text-2xl font-bold text-primary mb-1">{s.value}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide font-medium">
                {s.label}
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {QUICK_LINKS.map((q) => (
              <a
                key={q.href}
                href={q.href}
                className="card p-5 hover:shadow-md hover:border-primary/30 transition-all group cursor-pointer"
              >
                <div className="text-2xl mb-3">{q.icon}</div>
                <div className="font-semibold text-slate-700 text-sm group-hover:text-primary transition-colors">
                  {q.label}
                </div>
                <div className="text-xs text-slate-400 mt-1">{q.desc}</div>
              </a>
            ))}
          </div>
        </div>

        {/* Getting started banner */}
        <div className="card p-6 bg-gradient-to-r from-primary/5 to-blue-50 border-primary/20">
          <h3 className="font-semibold text-primary mb-2">🚀 Module 1 Complete — Auth & Scaffold</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            The project is scaffolded with <strong>Next.js 16</strong>, <strong>NestJS</strong>,{' '}
            <strong>PostgreSQL + Prisma</strong>, and <strong>JWT auth</strong>.
            Next: <strong>Module 2 — Employee Master</strong> (full CRUD with salary structure & statutory details).
          </p>
        </div>

      </main>
    </>
  );
}
