import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SightingsList } from '@/components/live/sightings-list';
import type { ParkSighting } from '@/lib/ebird/sightings';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  };
});

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element -- a stand-in for next/image in jsdom
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const sighting = (speciesCode: string, commonName: string, notable = false): ParkSighting => ({
  speciesCode, commonName, scientificName: 'X y', area: 'The Ramble', observedAt: '2026-10-10 08:00',
  count: 1, notable, unconfirmed: false, checklistUrl: 'https://ebird.org/checklist/S1',
});

vi.mock('@/lib/live/use-api', () => ({
  useApi: () => ({
    state: { status: 'ready', data: { fetchedAt: '', days: 3, sightings: [sighting('amerob', 'American Robin'), sighting('conwar', 'Connecticut Warbler', true)] } },
    reload: () => {},
  }),
}));
vi.mock('@/lib/log/use-log', () => ({ useLog: () => ({ state: { status: 'loading' } }) }));

const PHOTO = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Robin.jpg', width: 800, height: 600,
  artist: 'A. Birder', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Robin.jpg',
};

describe('SightingsList photos', () => {
  it('gives guide birds a photo that opens large, and birds outside the guide none', () => {
    render(<SightingsList guideCodes={['amerob']} photos={{ amerob: PHOTO }} preview={5} />);
    expect(screen.queryByRole('button', { name: 'Enlarge photo of Connecticut Warbler' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enlarge photo of American Robin' }));
    expect(screen.getByRole('dialog', { name: 'Photo of American Robin' })).toHaveTextContent('Photo: A. Birder');
    expect(screen.getByRole('link', { name: 'American Robin' })).toHaveAttribute('href', '/guide/amerob');
  });
});
