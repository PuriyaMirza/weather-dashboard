'use client';

import { weatherCardRegistry } from '@/components/weather/card-registry';
import { LocationSearch } from '@/components/location/location-search';
import { useHasHydrated } from '@/lib/hooks/use-has-hydrated';
import { useWeatherData } from '@/lib/hooks/use-weather-data';
import { formatLocationLabel } from '@/lib/weather/location';
import { useDashboardStore } from '@/store/dashboard-store';

export function Dashboard() {
  const hasHydrated = useHasHydrated();
  const location = useDashboardStore((state) => state.location);
  const setLocation = useDashboardStore((state) => state.setLocation);

  // Until saved preferences have loaded we don't know which location to request, so no fetch is
  // started and every card shows its loading state.
  const state = useWeatherData(hasHydrated ? location : null);

  const data = state.status === 'ready' ? state.data : undefined;
  const isLoading = !hasHydrated || state.status === 'loading';
  const errorMessage = state.status === 'error' ? (state.errorMessage ?? 'Unable to load weather data.') : undefined;

  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="dashboard-title">
      <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/80 backdrop-blur sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 id="dashboard-title" className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Weather Dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Live conditions from Open-Meteo. Search for any city or postal code — your choice is remembered on this
              device.
            </p>
            <div className="mt-5 max-w-md">
              <LocationSearch onSelect={setLocation} />
            </div>
          </div>

          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white" aria-label="Selected location">
            <p className="text-sm text-slate-300">Showing</p>
            <p className="text-xl font-semibold">{hasHydrated ? formatLocationLabel(location) : 'Loading…'}</p>
            <p className="mt-1 text-sm text-slate-300">Updated live from Open-Meteo</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2" aria-label="Weather cards">
        {weatherCardRegistry.map(({ id, columnSpan, Component }) => (
          <div key={id} className={columnSpan === 'wide' ? 'lg:col-span-2' : undefined}>
            <Component data={data} isLoading={isLoading} errorMessage={errorMessage} />
          </div>
        ))}
      </div>
    </section>
  );
}
