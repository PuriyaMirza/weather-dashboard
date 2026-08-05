import { weatherCardRegistry } from '@/components/weather/card-registry';
import { mockWeatherState } from '@/lib/weather/mock-data';

export default function Home() {
  const state = mockWeatherState;
  const data = state.data;
  const isLoading = state.status === 'loading';
  const errorMessage = state.status === 'error' ? state.errorMessage ?? 'Unable to load mock weather data.' : undefined;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe,transparent_35%),linear-gradient(180deg,#f8fafc,#eef6ff)] px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl" aria-labelledby="dashboard-title">
        <div className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-xl shadow-slate-200/80 backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-700">Milestone 2 · Mock data</p>
              <h1 id="dashboard-title" className="mt-3 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Weather Dashboard</h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Responsive, accessible dashboard shell powered by normalized TypeScript weather data and a card registry. Open-Meteo integration is intentionally deferred.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white" aria-label="Selected location">
              <p className="text-sm text-slate-300">Showing</p>
              <p className="text-xl font-semibold">{data ? `${data.location.name}, ${data.location.region}` : 'No location selected'}</p>
              <p className="mt-1 text-sm text-slate-300">Updated from mock data</p>
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
    </main>
  );
}
