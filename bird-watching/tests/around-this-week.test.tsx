import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AroundThisWeek } from '@/components/live/around-this-week';

// jsdom has <dialog> but not its modal methods; mimic just the open/close state they toggle.
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
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const weeks = (value: number) => Array.from({ length: 48 }, () => value);
const PHOTO = {
  src: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Robin.jpg', width: 800, height: 600,
  artist: 'A. Birder', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Robin.jpg',
};

function renderList() {
  render(
    <AroundThisWeek
      frequencies={{ amerob: weeks(0.6), houspa: weeks(0.7) }}
      names={{ amerob: 'American Robin', houspa: 'House Sparrow' }}
      photos={{ amerob: PHOTO }}
    />,
  );
}

describe('AroundThisWeek', () => {
  it('shows a photo that opens large with its credit, and keeps the name as a guide link', () => {
    renderList();
    expect(screen.getByRole('link', { name: 'American Robin' })).toHaveAttribute('href', '/guide/amerob');

    fireEvent.click(screen.getByRole('button', { name: 'Enlarge photo of American Robin' }));
    const dialog = screen.getByRole('dialog', { name: 'Photo of American Robin' });
    expect(dialog).toHaveTextContent('Photo: A. Birder');
    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' })).toHaveAttribute('href', PHOTO.licenseUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('gives a bird without a photo no button', () => {
    renderList();
    expect(screen.getByRole('link', { name: 'House Sparrow' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enlarge photo of House Sparrow' })).not.toBeInTheDocument();
  });
});
