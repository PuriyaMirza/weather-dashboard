import { placeholderWeather } from '@/lib/weather-schema';

const forecastCards = [
  { day: 'Today', high: 72, low: 58 },
  { day: 'Tomorrow', high: 70, low: 56 },
  { day: 'Wednesday', high: 67, low: 54 },
];

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <section className="mx-auto max-w-5xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200" aria-labelledby="dashboard-title">
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">Milestone 1</p>
        <h1 id="dashboard-title" className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          Weather Dashboard
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-600">
          Accessible placeholder interface for the upcoming draggable, validated, chart-ready weather dashboard.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3" aria-label="Placeholder forecast">
          {forecastCards.map((forecast) => (
            <article key={forecast.day} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900">{forecast.day}</h2>
              <p className="mt-2 text-slate-600">{placeholderWeather.condition}</p>
              <p className="mt-4 text-3xl font-bold text-slate-950">
                {forecast.high}°<span className="text-base font-medium text-slate-500"> / {forecast.low}°F</span>
              </p>
            </article>
          ))}
        </div>

        <form className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row" aria-label="City search placeholder">
          <label className="sr-only" htmlFor="city">
            City
          </label>
          <input
            id="city"
            name="city"
            type="text"
            placeholder="Search by city"
            className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-slate-900"
          />
          <button type="button" className="min-h-12 rounded-xl bg-sky-700 px-6 font-semibold text-white hover:bg-sky-800">
            Preview
          </button>
        </form>
      </section>
    </main>
  );
}
