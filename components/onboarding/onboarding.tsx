'use client';

import { useId, useRef, useState } from 'react';
import { LocationSearch } from '@/components/location/location-search';
import { Icon, type IconName } from '@/components/ui/icon';
import { FavoriteMetricsPicker } from '@/components/weather/favorite-metrics-picker';
import { getCardDefinition, type WeatherCardId } from '@/components/weather/card-registry';
import { useDialogFocus } from '@/lib/hooks/use-dialog-focus';
import { ACTIVITIES, type ActivityId } from '@/lib/weather/activity-windows';
import { composeLayoutForActivities, type CardLayoutEntry } from '@/lib/weather/card-layout';
import {
  DEFAULT_FAVORITE_METRICS,
  MAX_FAVORITE_METRICS,
  type FavoriteMetricId,
} from '@/lib/weather/favorite-metrics';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';
import type { OnboardingResult } from '@/store/dashboard-store';

interface OnboardingProps {
  /** Seeds the location step, so the flow opens on something real rather than a blank. */
  initialLocation: SelectedLocation;
  onComplete: (result: OnboardingResult) => void;
  onSkip: () => void;
}

const STEPS = ['location', 'activities', 'favorites', 'modules'] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, string> = {
  location: 'Where are you?',
  activities: 'What do you do outside?',
  favorites: 'Pick your four favorites',
  modules: 'Here is your dashboard',
};

const ACTIVITY_ICONS: Record<ActivityId, IconName> = {
  walk: 'walk',
  run: 'run',
  cycle: 'bike',
  garden: 'garden',
};

const FOCUS_RING ='outline-none focus-visible:ring-2 focus-visible:ring-secondary-fixed';

const PRIMARY =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full bg-secondary-fixed px-5 type-label-lg text-on-secondary ' +
  `hover:bg-primary-fixed ${FOCUS_RING} focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-low ` +
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-secondary-fixed';
const SECONDARY =
  'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-outline-variant px-5 type-label-lg ' +
  `text-on-surface hover:bg-surface-container-high ${FOCUS_RING}`;
const QUIET =
  'inline-flex min-h-11 shrink-0 items-center rounded-full px-3 type-label-md text-on-surface-variant underline ' +
  `underline-offset-4 hover:text-primary ${FOCUS_RING}`;

/**
 * The first-run flow: four questions that compose a dashboard.
 *
 * The dashboard has always been customizable and has always presented as a blank slate — every
 * module in the default layout was chosen by us, and changing that meant finding the menu. This
 * asks instead, and the middle question is the one that earns its place: "what do you do outside"
 * is a question people can actually answer, and it implies the readings better than a list of
 * twenty-two modules does.
 *
 * Nothing here reaches the network or an account. The answers go to the same `localStorage`-backed
 * store every other preference already uses.
 *
 * Skipping is a first-class answer, not a trap door: Escape and a visible control both take it, and
 * it is recorded, so the flow never asks twice.
 */
export function Onboarding({ initialLocation, onComplete, onSkip }: OnboardingProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [location, setLocation] = useState(initialLocation);
  const [activities, setActivities] = useState<ActivityId[]>([]);
  const [favoriteMetrics, setFavoriteMetrics] = useState<FavoriteMetricId[]>(DEFAULT_FAVORITE_METRICS);
  /** Fixed when the last step opens, so unchecking a row does not make it vanish mid-decision. */
  const [proposed, setProposed] = useState<CardLayoutEntry[]>([]);
  const [excluded, setExcluded] = useState<Set<WeatherCardId>>(new Set());

  const step = STEPS[stepIndex];
  const chosen = proposed.filter((entry) => !excluded.has(entry.id));

  useDialogFocus(true, panelRef, onSkip, step);

  function toggleActivity(id: ActivityId) {
    setActivities((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleFavorite(id: FavoriteMetricId) {
    setFavoriteMetrics((current) => {
      if (current.includes(id)) return current.length > 1 ? current.filter((value) => value !== id) : current;
      return current.length < MAX_FAVORITE_METRICS ? [...current, id] : current;
    });
  }

  function toggleModule(id: WeatherCardId) {
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function goBack() {
    setStepIndex((index) => Math.max(0, index - 1));
  }

  function goNext() {
    // Recomposed on every pass so going back, changing an answer and returning cannot leave a
    // layout built from the previous answer on screen.
    if (step === 'activities') {
      setProposed(composeLayoutForActivities(activities));
      setExcluded(new Set());
    }
    setStepIndex((index) => Math.min(STEPS.length - 1, index + 1));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-surface/90 px-4 py-8 backdrop-blur-sm sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl rounded-2xl bg-surface-container-low text-on-surface shadow-raised"
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div>
            <p aria-hidden="true" className="mb-3 flex gap-1.5">
              {STEPS.map((candidate, index) => (
                <span
                  key={candidate}
                  className={`h-1.5 rounded-full ${index <= stepIndex ? 'w-8 bg-secondary-fixed' : 'w-4 bg-surface-container-highest'}`}
                />
              ))}
            </p>
            <h2 id={titleId} className="font-display text-3xl leading-tight text-primary">
              {STEP_TITLE[step]}
            </h2>
            {/* Spoken as well as drawn: the position in the flow is stated in words, and announced
                on change, rather than living only in a row of marks. */}
            <p aria-live="polite" className="mt-1 type-label-sm uppercase text-secondary">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>
          <button type="button" onClick={onSkip} className={QUIET}>
            Skip setup
          </button>
        </div>

        <div className="px-6 pb-6 pt-2">
          {step === 'location' && (
            <>
              <p className="type-body-md text-on-surface-variant">
                Search for a place, or use your current location. This stays in this browser — there is
                no account and nothing is sent anywhere but the forecast request itself.
              </p>
              <div className="mt-5 max-w-md">
                <LocationSearch onSelect={setLocation} />
              </div>
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-surface-container-high px-4 py-3 type-body-sm text-on-surface">
                <Icon name="location" size={18} className="shrink-0 text-secondary-fixed" />
                <span>
                  Using <span className="type-label-lg text-primary">{formatLocationLabel(location)}</span>
                </span>
              </p>
            </>
          )}

          {step === 'activities' && (
            <>
              <p className="type-body-md text-on-surface-variant">
                Pick any that apply. The dashboard uses these to work out which readings matter to you —
                and to tell you the best time to go out. You can skip this and still get a full dashboard.
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {ACTIVITIES.map((activity) => (
                  <CheckRow
                    key={activity.id}
                    id={`activity-${activity.id}`}
                    title={activity.label}
                    description={activity.description}
                    isChecked={activities.includes(activity.id)}
                    icon={ACTIVITY_ICONS[activity.id]}
                    onToggle={() => toggleActivity(activity.id)}
                  />
                ))}
              </ul>
            </>
          )}

          {step === 'favorites' && (
            <>
              <p className="type-body-md text-on-surface-variant">
                These sit at the top of your dashboard, always in view. Choose up to four — you can
                change them any time from the menu.
              </p>
              <div className="mt-5">
                <FavoriteMetricsPicker selected={favoriteMetrics} onToggle={toggleFavorite} />
              </div>
            </>
          )}

          {step === 'modules' && (
            <>
              <p className="type-body-md text-on-surface-variant">
                {activities.length > 0
                  ? 'Built from your answers. Switch off anything you do not want — you can add the rest from the menu later.'
                  : 'A starting point, since you did not pick any activities. You can change all of this from the menu later.'}
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {proposed.map((entry) => {
                  const definition = getCardDefinition(entry.id);
                  if (!definition) return null;
                  return (
                    <CheckRow
                      key={entry.id}
                      id={`module-${entry.id}`}
                      title={definition.title}
                      description={definition.description}
                      isChecked={!excluded.has(entry.id)}
                      onToggle={() => toggleModule(entry.id)}
                    />
                  );
                })}
              </ul>
              {chosen.length === 0 && (
                <p role="status" className="mt-4 rounded-xl border border-dashed border-on-surface-variant px-4 py-3 type-body-sm text-on-surface">
                  Keep at least one module — an empty dashboard has nothing to show.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-outline-variant px-6 py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className={`${SECONDARY} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
          >
            <Icon name="arrow-back" size={18} />
            Back
          </button>

          {step === 'modules' ? (
            <button
              type="button"
              onClick={() => onComplete({ location, activities, cards: chosen, favoriteMetrics })}
              disabled={chosen.length === 0}
              className={PRIMARY}
            >
              <Icon name="check" size={18} />
              Use this dashboard
            </button>
          ) : (
            <button type="button" onClick={goNext} className={PRIMARY}>
              Continue
              <Icon name="arrow-forward" size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * One checkbox row. A real checkbox rather than a styled button so its state is announced, and the
 * tick — not only the fill — carries that state for anyone who cannot separate the two tones.
 *
 * Deliberately the same anatomy as the menu's module list: this flow should feel like the settings
 * the user will meet later, not like a separate product.
 */
function CheckRow({
  id,
  title,
  description,
  isChecked,
  onToggle,
  icon,
}: {
  id: string;
  title: string;
  description: string;
  isChecked: boolean;
  onToggle: () => void;
  icon?: IconName;
}) {
  return (
    <li>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-surface-container-high px-4 py-3 hover:bg-surface-container-highest has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary-fixed">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-secondary-fixed">
            <Icon name={icon} size={20} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span id={`${id}-label`} className="block type-label-lg text-on-surface">
            {title}
          </span>
          <span id={`${id}-description`} className="block type-body-sm text-on-surface-variant">
            {description}
          </span>
        </span>
        <input
          type="checkbox"
          checked={isChecked}
          onChange={onToggle}
          className="peer sr-only"
          aria-labelledby={`${id}-label`}
          aria-describedby={`${id}-description`}
        />
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-on-surface-variant text-on-secondary peer-checked:border-secondary-fixed peer-checked:bg-secondary-fixed"
        >
          {isChecked && <Icon name="check" size={16} />}
        </span>
      </label>
    </li>
  );
}
