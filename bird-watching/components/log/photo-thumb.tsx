'use client';

import { useEffect, useState } from 'react';
import { getRepository } from '@/lib/log/use-repository';

/** The photo a sighting was logged from, read back from the on-device store. */
export function PhotoThumb({ photoId, alt }: { photoId: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    void getRepository()
      .repo.getPhoto(photoId)
      .then((blob) => {
        if (!blob || cancelled) return;
        url = URL.createObjectURL(blob);
        setSrc(url);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photoId]);
  if (!src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote asset
  return <img src={src} alt={alt} className="h-14 w-14 shrink-0 rounded-lg object-cover" />;
}
