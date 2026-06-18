import Sidebar from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      {/* Main content area — offset by sidebar width */}
      <div className="flex-1 ml-60 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}
