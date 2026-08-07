import { Dashboard } from '@/components/dashboard/dashboard';
import { SiteFooter } from '@/components/dashboard/site-footer';

// The page is a static shell. Weather is fetched in the browser via /api/weather, because the
// location comes from preferences that only exist on the client.
export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_35%),linear-gradient(180deg,#f8fafc,#eef6ff)] px-4 py-6 sm:px-6 lg:px-10">
      <Dashboard />
      <SiteFooter />
    </main>
  );
}
