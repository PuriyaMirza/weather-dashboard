import { Dashboard } from '@/components/dashboard/dashboard';
import { SiteFooter } from '@/components/dashboard/site-footer';

// The page is a static shell. Weather is fetched in the browser via /api/weather, because the
// location comes from preferences that only exist on the client.
export default function Home() {
  return (
    <main className="min-h-screen bg-canvas px-4 py-6 sm:px-6 lg:px-10">
      <Dashboard />
      <SiteFooter />
    </main>
  );
}
