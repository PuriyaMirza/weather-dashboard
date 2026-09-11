'use client';

import { useId, useRef, useState } from 'react';
import { LocationSearch } from '@/components/location/location-search';
import { getCardDefinition, type WeatherCardId } from '@/components/weather/card-registry';
import { useDialogFocus } from '@/lib/hooks/use-dialog-focus';
import { ACTIVITIES, type ActivityId } from '@/lib/weather/activity-windows';
import { composeLayoutForActivities, type CardLayoutEntry } from '@/lib/weather/card-layout';
import { formatLocationLabel, type SelectedLocation } from '@/lib/weather/location';
import type { OnboardingResult } from '@/store/dashboard-store';

interface OnboardingProps {
  /** Seeds the location step, so the flow opens on something real rather than a blank. */
  initialLocation: SelectedLocation;
  onComplete: (result: OnboardingResult) => void;
  onSkip: () => void;
}

const STEPS = ['location', 'activities', 'modules'] as const;
type Step = (typeof STEPS)[number];

const STEP_TITLE: Record<Step, string> = {
  location: 'Where are you?',
  activities: 'What do you do outside?',
  modules: 'Here is your dashboard',
};

const PRIMARY =
  'border border-line-strong bg-accent px-4 py-2 text-xs uppercase tracking-[0.14em] text-accent-ink outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY =
  'border border-line-strong px-4 py-2 text-xs uppercase tracking-[0.14em] text-ink outline-none hover:bg-accent hover:text-accent-ink focus-visible:ring-2 focus-visible:ring-accent';
const QUIET =
  'eyebrow text-muted underline underline-offset-4 outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-accent';

/**
 * The first-run flow: three questions that compose a dashboard.
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-canvas/95 px-4 py-8 sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-2xl border border-line-strong bg-card"
      >
        <div className="flex items-baseline justify-between gap-4 border-b border-line-strong px-6 py-4">
          <div>
            <h2 id={titleId} className="font-display text-3xl leading-none text-ink-strong">
              {STEP_TITLE[step]}
            </h2>
            {/* Spoken as well as drawn: the position in the flow is stated in words, and announced
                on change, rather than living only in a row of marks. */}
            <p aria-live="polite" className="eyebrow mt-2 text-muted">
              Step {stepIndex + 1} of {STEPS.length}
            </p>
          </div>
          <button type="button" onClick={onSkip} className={QUIET}>
            Skip setup
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 'location' && (
            <>
              <p className="text-sm text-ink">
                Search for a place, or use your current location. This stays in this browser — there is
                no account and nothing is sent anywhere but the forecast request itself.
              </p>
              <div className="mt-5 max-w-md">
                <LocationSearch onSelect={setLocation} />
              </div>
              <p className="mt-5 border-t border-line pt-3 text-sm text-ink">
                Using <span className="font-display text-xl text-ink-strong">{formatLocationLabel(location)}</span>
              </p>
            </>
          )}

          {step === 'activities' && (
            <>
              <p className="text-sm text-ink">
                Pick any that apply. The dashboard uses these to work out which readings matter to you —
                and to tell you the best time to go out. You can skip this and still get a full dashboard.
              </p>
              <ul className="mt-5">
                {ACTIVITIES.map((activity) => (
                  <CheckRow
                    key={activity.id}
                    id={`activity-${activity.id}`}
                    title={activity.label}
                    description={activity.description}
                    isChecked={activities.includes(activity.id)}
                    onToggle={() => toggleActivity(activity.id)}
                  />
                ))}
              </ul>
            </>
          )}

          {step === 'modules' && (
            <>
              <p className="text-sm text-ink">
                {activities.length > 0
                  ? 'Built from your answers. Switch off anything you do not want — you can add the rest from the menu later.'
                  : 'A starting point, since you did not pick any activities. You can change all of this from the menu later.'}
              </p>
              <ul className="mt-5">
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
                <p role="status" className="mt-4 border border-dashed border-line px-3 py-2 text-xs text-muted">
                  Keep at least one module — an empty dashboard has nothing to show.
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-line-strong px-6 py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className={`${SECONDARY} disabled:cursor-not-allowed disabled:opacity-40`}
          >
            Back
          </button>

          {step === 'modules' ? (
            <button
              type="button"
              onClick={() => onComplete({ location, activities, cards: chosen })}
              disabled={chosen.length === 0}
              className={PRIMARY}
            >
              Use this dashboard
            </button>
          ) : (
            <button type="button" onClick={goNext} className={PRIMARY}>
              Continue
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
}: {
  id: string;
  title: string;
  description: string;
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="border-t border-line last:border-b">
      <label className="flex cursor-pointer items-center justify-between gap-3 py-3">
        <span className="min-w-0">
          <span id={`${id}-label`} className="block text-sm text-ink">
            {title}
          </span>
          <span id={`${id}-description`} className="block text-xs text-muted">
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
          className="flex h-5 w-5 shrink-0 items-center justify-center border border-line-strong text-[0.6rem] leading-none text-accent-ink peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent"
        >
          {isChecked ? '✓' : ''}
        </span>
      </label>
    </li>
  );
}
