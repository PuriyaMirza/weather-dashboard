import type { WeatherCondition } from '@/lib/weather/types';

interface WeatherEffectProps {
  condition: WeatherCondition;
  isDay: boolean;
}

interface Particle {
  left: number;
  duration: number;
  delay: number;
}

/**
 * Deterministic pseudo-scatter: no Math.random or Date.now, so the same condition always renders
 * the same markup. That matters less than it would elsewhere — this only ever renders after the
 * client fetch resolves (see the `current &&` gate in hero.tsx), never during the server pass — but
 * it's free, keeps the component pure, and makes the count/positions trivial to assert on in tests.
 */
function buildParticles(count: number, seedA: number, seedB: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    left: (i * seedA) % 100,
    duration: 0.7 + ((i * seedB) % 50) / 100,
    delay: ((i * (seedA + seedB)) % 130) / 100,
  }));
}

// Counts are tuned to read as "raining"/"snowing" from staggered timing, not from covering the
// card — more elements is more main-thread paint work for no visible gain at hero size.
const RAIN_STREAKS = buildParticles(16, 53, 29);
const STORM_STREAKS = buildParticles(20, 47, 31);
const SNOW_FLAKES = buildParticles(12, 61, 37).map((flake, i) => ({
  ...flake,
  duration: flake.duration * 3.5,
  size: 3 + (i % 3),
}));

function Rain({ streaks }: { streaks: Particle[] }) {
  return (
    <>
      {streaks.map((streak, i) => (
        <span
          key={i}
          className="weather-effect-streak"
          style={{ left: `${streak.left}%`, animationDuration: `${streak.duration}s`, animationDelay: `${streak.delay}s` }}
        />
      ))}
    </>
  );
}

/**
 * Decorative per-condition motion behind the hero text, kept to transform/opacity so the browser
 * composites it off the main thread (see app/globals.css for the keyframes and the shared why).
 * Purely decorative — the condition is always stated in words in the hero heading above this — so
 * it's always aria-hidden and never the only signal.
 *
 * Partly-cloudy/cloudy/fog get no effect: the existing static fog-band art already reads right for
 * them, and a sunny night gets no glow (there's no sun in it to glow).
 */
export function WeatherEffect({ condition, isDay }: WeatherEffectProps) {
  if (condition === 'sunny') {
    if (!isDay) return null;
    return (
      <div aria-hidden="true" className="weather-effect-layer">
        <div className="weather-effect-glow" />
      </div>
    );
  }

  if (condition === 'rain') {
    return (
      <div aria-hidden="true" className="weather-effect-layer">
        <Rain streaks={RAIN_STREAKS} />
      </div>
    );
  }

  if (condition === 'storm') {
    return (
      <div aria-hidden="true" className="weather-effect-layer">
        <Rain streaks={STORM_STREAKS} />
        <div className="weather-effect-flash" />
      </div>
    );
  }

  if (condition === 'snow') {
    return (
      <div aria-hidden="true" className="weather-effect-layer">
        {SNOW_FLAKES.map((flake, i) => (
          <span
            key={i}
            className="weather-effect-flake"
            style={{
              left: `${flake.left}%`,
              width: flake.size,
              height: flake.size,
              animationDuration: `${flake.duration}s`,
              animationDelay: `${flake.delay}s`,
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}
