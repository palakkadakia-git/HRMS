/**
 * Standalone kiosk layout — no sidebar, no nav.
 * The /kiosk route is PUBLIC (no HR login required).
 * The kiosk authenticates via its own token stored in localStorage.
 */
export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {children}
    </div>
  );
}
