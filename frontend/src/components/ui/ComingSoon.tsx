interface ComingSoonProps {
  module: string;
  description: string;
  icon?: string;
}

export default function ComingSoon({ module, description, icon = '🔧' }: ComingSoonProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-12">
      <div className="text-center max-w-md">
        <div className="text-5xl mb-5">{icon}</div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">{module}</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">{description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Coming Next Module
        </div>
      </div>
    </div>
  );
}
