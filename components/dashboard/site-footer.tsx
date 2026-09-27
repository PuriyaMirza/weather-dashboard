import { Icon } from '@/components/ui/icon';

const LINK_CLASS =
  'text-secondary-fixed underline underline-offset-2 outline-none hover:text-primary focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-secondary-fixed';

/**
 * Open-Meteo publishes its data under CC BY 4.0, which requires crediting the source, linking the
 * licence, and indicating that changes were made — this app converts units and reshapes the
 * response, so that last point is stated rather than glossed over.
 */
export function SiteFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center gap-2 px-5 pb-10 text-center type-label-sm text-on-surface-variant">
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

      <details className="group w-full max-w-xl">
        <summary className="mx-auto flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-on-secondary-container outline-none hover:text-secondary-fixed focus-visible:ring-2 focus-visible:ring-secondary-fixed [&::-webkit-details-marker]:hidden">
          How your location is used
          <Icon name="expand-more" size={16} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 space-y-2 rounded-xl bg-surface-container-low p-4 text-left type-body-sm text-on-surface-variant shadow-card">
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
