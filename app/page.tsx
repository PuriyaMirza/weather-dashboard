import { Dashboard } from '@/components/dashboard/dashboard';
import { SiteFooter } from '@/components/dashboard/site-footer';

// The page is a static shell. Weather is fetched in the browser via /api/weather, because the
// location comes from preferences that only exist on the client. No padding here: the sticky
// header runs edge to edge, and the dashboard pads its own content column.
export default function Home() {
  return (
    <main className="min-h-screen bg-surface">
      <Dashboard />
      <SiteFooter />
    </main>
  );
}
