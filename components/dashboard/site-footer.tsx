const LINK_CLASS = 'font-medium text-accent-soft-ink underline underline-offset-2 outline-none hover:text-accent-soft-ink focus-visible:ring-2 focus-visible:ring-accent';

/**
 * Open-Meteo publishes its data under CC BY 4.0, which requires crediting the source, linking the
 * licence, and indicating that changes were made — this app converts units and reshapes the
 * response, so that last point is stated rather than glossed over.
 */
export function SiteFooter() {
  return (
    <footer className="mx-auto mt-10 max-w-7xl px-1 pb-8 text-sm text-muted">
      <p>
        Weather data by{' '}
        <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          Open-Meteo.com
        </a>
        , licensed under{' '}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          CC BY 4.0
        </a>
        . Values are converted and reformatted for display.
      </p>

      <details className="mt-3 rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent">
          How your location is used
        </summary>
        <div className="mt-3 space-y-2">
          <p>
            Your chosen location, measurement units, and card layout are stored only in this browser. There are no
            accounts, no database, and nothing is synced between devices — clearing your browser data removes them.
          </p>
          <p>
            To fetch a forecast, the coordinates of the selected place are sent to this site&apos;s own server, which
            requests the weather from Open-Meteo. The place name you type is sent the same way to look up its
            coordinates.
          </p>
          <p>
            “Use my current location” asks your browser for your coordinates, and your browser will ask your permission
            first. Those coordinates are used for the forecast request and saved as your selected location; declining is
            always fine — the search box does the same job.
          </p>
        </div>
      </details>
    </footer>
  );
}
