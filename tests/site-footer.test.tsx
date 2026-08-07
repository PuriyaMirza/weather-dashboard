import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SiteFooter } from '@/components/dashboard/site-footer';

describe('SiteFooter — Open-Meteo attribution', () => {
  it('credits Open-Meteo with a link, as CC BY 4.0 requires', () => {
    render(<SiteFooter />);

    const link = screen.getByRole('link', { name: /open-meteo\.com/i });
    expect(link).toHaveAttribute('href', 'https://open-meteo.com/');
  });

  it('links the licence itself, not just the source', () => {
    render(<SiteFooter />);

    const licence = screen.getByRole('link', { name: /cc by 4\.0/i });
    expect(licence).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/4.0/');
  });

  it('indicates that the data is modified, which the licence also requires', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/converted and reformatted/i)).toBeInTheDocument();
  });

  it('opens external links safely', () => {
    render(<SiteFooter />);

    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    }
  });
});

describe('SiteFooter — location privacy note', () => {
  it('is reachable through a labelled disclosure', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/how your location is used/i)).toBeInTheDocument();
  });

  it('states where preferences are stored and that nothing is synced', () => {
    render(<SiteFooter />);

    expect(screen.getByText(/stored only in this browser/i)).toBeInTheDocument();
    expect(screen.getByText(/no accounts, no database/i)).toBeInTheDocument();
  });

  it('is honest that coordinates leave the browser to fetch a forecast', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/coordinates of the selected place are sent/i)).toBeInTheDocument();
  });

  it('explains that declining geolocation is fine', () => {
    render(<SiteFooter />);
    expect(screen.getByText(/declining is\s+always fine/i)).toBeInTheDocument();
  });
});
