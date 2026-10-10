import type { Metadata } from 'next';
import { PhotoAdd } from '@/components/log/photo-add';

export const metadata: Metadata = { title: 'Add from photo' };

export default function PhotoAddPage() {
  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h1 className="type-display-lg text-primary">Add from photo</h1>
      </header>
      <PhotoAdd />
    </div>
  );
}
