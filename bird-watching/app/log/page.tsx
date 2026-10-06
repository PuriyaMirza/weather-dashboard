import type { Metadata } from 'next';
import { LogHome } from '@/components/log/log-home';

export const metadata: Metadata = { title: 'Your log' };

export default function LogPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="type-display-lg text-primary">Your log</h1>
        <p className="type-body-md text-on-surface-variant">
          Keep an eBird-style checklist of every walk, build your life list, and upload to eBird when you get home.
        </p>
      </header>
      <LogHome />
    </div>
  );
}
