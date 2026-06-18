interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
      <div>
        <h1 className="text-[17px] font-semibold text-slate-800 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        {/* suppressHydrationWarning: date string differs between server and browser locale */}
        <span suppressHydrationWarning className="text-xs text-slate-400 hidden sm:block">{today}</span>
      </div>
    </header>
  );
}
