'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { PhotoCredit } from '@/components/guide/species-photo';
import { Icon } from '@/components/ui/icon';
import { Surface } from '@/components/ui/surface';
import { identifyCanvas, keepCanvas, loadImage, toBase64Jpeg, toJpegBlob } from '@/lib/identify/image';
import type { CandidatePhoto, IdentifyCandidate, IdentifyResponse } from '@/lib/identify/schema';
import { useApi } from '@/lib/live/use-api';
import { localDateTime, newObservation, newOuting } from '@/lib/log/factory';
import { isParkArea } from '@/lib/log/park-areas';
import { getRepository } from '@/lib/log/use-repository';

type Step =
  | { name: 'pick' }
  | { name: 'describe' }
  | { name: 'identifying' }
  | { name: 'confirm'; result: IdentifyResponse };

const CONFIDENCE_LABEL: Record<IdentifyCandidate['confidence'], string> = {
  high: 'Very likely',
  medium: 'Likely',
  low: 'Possible',
};

const OTHER = 'other';
const pill =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-outline-variant px-4 type-label-lg text-on-surface hover:bg-surface-container-high';
const primary =
  'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-secondary-fixed px-4 type-label-lg text-on-secondary disabled:opacity-50';
const field = 'min-h-11 w-full rounded-lg border border-outline-variant bg-surface px-3 type-body-md text-on-surface';

/**
 * One suggestion as a radio row. Its reference photo loads on its own after the row shows, from
 * our CDN-cached /api/species-photo, so the ID never waits on Wikipedia and Wikipedia sees about
 * one request per species per week.
 */
function CandidateRow({ candidate, checked, onSelect }: { candidate: IdentifyCandidate; checked: boolean; onSelect: () => void }) {
  const { state } = useApi<{ photo: CandidatePhoto | null }>(`/api/species-photo?sci=${encodeURIComponent(candidate.scientificName)}`);
  const photo = state.status === 'ready' ? state.data.photo : null;
  return (
    <label className="flex min-h-14 cursor-pointer items-start gap-3 px-3 py-2.5">
      <input type="radio" name="species" checked={checked} onChange={onSelect} className="mt-1 h-5 w-5 accent-[var(--secondary-fixed)]" />
      <span aria-hidden="true" className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-highest">
        {photo && <Image src={photo.src} alt="" fill sizes="80px" className="object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block type-label-lg text-primary">
          {candidate.commonName} <span className="type-body-sm text-on-surface-variant">· {CONFIDENCE_LABEL[candidate.confidence]}</span>
        </span>
        <span className="block type-body-sm italic text-on-surface-variant">{candidate.scientificName}</span>
        <span className="block type-body-sm text-on-surface">{candidate.fieldMarks}</span>
        {photo && (
          <span className="mt-1 block type-label-sm text-on-surface-variant">
            <PhotoCredit photo={photo} />
          </span>
        )}
      </span>
    </label>
  );
}

/**
 * Photo → Claude → log. The birder taps the bird (so only a small crop is sent), says when and
 * where in their own words, then confirms what Claude suggests — nothing is saved unconfirmed.
 */
export function PhotoAdd() {
  const router = useRouter();
  const ids = { file: useId(), note: useId(), when: useId(), where: useId(), count: useId(), other: useId() };
  const [step, setStep] = useState<Step>({ name: 'pick' });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [tap, setTap] = useState<{ fx: number; fy: number } | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState<string>('0');
  const [sentImage, setSentImage] = useState('');
  const [more, setMore] = useState<'idle' | 'loading' | 'done'>('idle');
  const [moreError, setMoreError] = useState<string | null>(null);
  const [otherName, setOtherName] = useState('');
  const [when, setWhen] = useState('');
  const [where, setWhere] = useState('');
  const [count, setCount] = useState(1);
  const [useMapPoint, setUseMapPoint] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (image) URL.revokeObjectURL(image.src);
  }, [image]);

  async function choose(file: File) {
    setError(null);
    try {
      setImage(await loadImage(file));
      setTap(null);
      setStep({ name: 'describe' });
    } catch {
      setError("That file couldn't be opened as a photo.");
    }
  }

  async function identify() {
    if (!image) return;
    setError(null);
    setStep({ name: 'identifying' });
    const sent = toBase64Jpeg(identifyCanvas(image, tap));
    try {
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: sent, note, now: localDateTime(new Date()) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body && typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.');
        return setStep({ name: 'describe' });
      }
      const result = body as IdentifyResponse;
      const today = localDateTime(new Date());
      setChoice(result.candidates.length ? '0' : OTHER);
      setSentImage(sent);
      setMore('idle');
      setMoreError(null);
      setWhen(`${result.date ?? today.slice(0, 10)}T${result.time ?? '12:00'}`);
      setWhere(result.place.parkArea ?? result.place.name ?? '');
      setCount(result.count ?? 1);
      setUseMapPoint(true);
      setStep({ name: 'confirm', result });
    } catch {
      setError("You're offline, or the app couldn't be reached. Photo ID needs a connection.");
      setStep({ name: 'describe' });
    }
  }

  /** Asks Claude again for lookalikes — only when the birder taps for them, since it's a second paid call. */
  async function showMoreOptions(result: IdentifyResponse) {
    setMore('loading');
    setMoreError(null);
    try {
      const response = await fetch('/api/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: sentImage,
          note,
          now: localDateTime(new Date()),
          exclude: result.candidates.map((c) => c.scientificName),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMoreError(body && typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.');
        return setMore('idle');
      }
      // Only the candidates are used; the date and place the birder may already have edited stay put.
      const seen = new Set(result.candidates.map((c) => c.scientificName.toLowerCase()));
      const extra = (body as IdentifyResponse).candidates.filter((c) => !seen.has(c.scientificName.toLowerCase())).slice(0, 3 - result.candidates.length);
      setStep({ name: 'confirm', result: { ...result, candidates: [...result.candidates, ...extra] } });
      setMore('done');
    } catch {
      setMoreError("You're offline, or the app couldn't be reached.");
      setMore('idle');
    }
  }

  async function save(result: IdentifyResponse) {
    if (!image) return;
    const picked = choice === OTHER ? null : result.candidates[Number(choice)];
    const commonName = picked?.commonName ?? otherName.trim();
    if (!commonName || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return;
    setSaving(true);
    const { repo } = getRepository();
    const area = where.trim() || 'Unknown location';
    const inPark = isParkArea(area);
    // The map point belongs to the place Claude read from the note; a retyped place drops it.
    const keepPoint = !inPark && useMapPoint && area === result.place.name;
    // A single photographed bird is an incidental sighting, not a complete checklist.
    const outing = {
      ...newOuting(new Date(when)),
      startTime: when,
      area,
      protocol: 'incidental' as const,
      allReported: false,
      latitude: keepPoint ? result.place.latitude : null,
      longitude: keepPoint ? result.place.longitude : null,
      stateCode: inPark ? 'NY' : result.place.stateCode,
      countryCode: inPark ? 'US' : result.place.countryCode,
    };
    const photoId = crypto.randomUUID();
    const observation = {
      ...newObservation(outing.id, {
        code: picked?.speciesCode ?? null,
        commonName,
        scientificName: picked?.scientificName ?? null,
      }),
      count: Math.max(1, count),
      photoId,
    };
    await repo.savePhoto(photoId, await toJpegBlob(keepCanvas(image)));
    await repo.saveOuting(outing);
    await repo.saveObservation(observation);
    router.push(`/log/outing?id=${outing.id}`);
  }

  if (step.name === 'pick') {
    return (
      <div className="flex flex-col gap-4">
        <p className="type-body-md text-on-surface-variant">
          Choose a photo of one bird. You&rsquo;ll tap the bird, say when and where you saw it, and confirm the ID.
        </p>
        <label htmlFor={ids.file} className={primary}>
          <Icon name="add" size={22} />
          Choose a photo
        </label>
        <input
          id={ids.file}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
            event.target.value = '';
          }}
        />
        {error && <p role="alert" className="type-body-md text-error">{error}</p>}
      </div>
    );
  }

  const photo = image && (
    <div className="relative">
      <button
        type="button"
        className="block w-full overflow-hidden rounded-xl"
        aria-label={tap ? 'Bird marked. Tap again to move the mark.' : 'Tap where the bird is'}
        disabled={step.name !== 'describe'}
        onClick={(event) => {
          // A keyboard press has no pointer position; centre the crop instead.
          if (event.detail === 0) return setTap({ fx: 0.5, fy: 0.5 });
          const rect = event.currentTarget.getBoundingClientRect();
          setTap({ fx: (event.clientX - rect.left) / rect.width, fy: (event.clientY - rect.top) / rect.height });
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not a remote asset */}
        <img src={image.src} alt="Your photo" className="block max-h-[50vh] w-full object-contain" />
      </button>
      {tap && (
        <span
          aria-hidden
          className="pointer-events-none absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
          style={{ left: `${tap.fx * 100}%`, top: `${tap.fy * 100}%` }}
        />
      )}
    </div>
  );

  if (step.name === 'describe' || step.name === 'identifying') {
    const busy = step.name === 'identifying';
    return (
      <div className="flex flex-col gap-4">
        {photo}
        <p className="type-body-sm text-on-surface-variant">
          {tap ? 'Only the area around your mark is sent, which keeps the ID quick and accurate.' : 'Tap the bird so Claude looks in the right place, or send the whole photo.'}
        </p>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.note} className="type-label-lg text-primary">
            When and where did you see it?
          </label>
          <input
            id={ids.note}
            className={field}
            value={note}
            maxLength={300}
            placeholder="This morning at the Ramble"
            onChange={(event) => setNote(event.target.value)}
            disabled={busy}
          />
        </div>
        {error && <p role="alert" className="type-body-md text-error">{error}</p>}
        <button type="button" className={primary} onClick={identify} disabled={busy}>
          {busy ? 'Identifying…' : tap ? 'Identify bird' : 'Identify from whole photo'}
        </button>
        <button type="button" className={pill} onClick={() => setStep({ name: 'pick' })} disabled={busy}>
          Choose a different photo
        </button>
        <p role="status" className="sr-only">{busy ? 'Identifying your bird' : ''}</p>
      </div>
    );
  }

  const { result } = step;
  const otherChosen = choice === OTHER;
  const canAskMore = more !== 'done' && result.candidates.length > 0 && result.candidates.length < 3;
  const canSave = (otherChosen ? otherName.trim().length > 0 : true) && when.length === 16;
  const showMapPoint = result.place.mapLabel && !isParkArea(where.trim()) && where.trim() === result.place.name;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        void save(result);
      }}
    >
      {photo}
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 type-label-lg text-primary">Which bird is it?</legend>
        {result.candidates.length === 0 && (
          <p className="type-body-md text-on-surface-variant">Claude couldn&rsquo;t find a bird in this photo. Type the name below.</p>
        )}
        <Surface tone="container" className="flex flex-col py-1">
          {result.candidates.map((candidate, index) => (
            <CandidateRow
              key={`${candidate.scientificName}-${index}`}
              candidate={candidate}
              checked={choice === String(index)}
              onSelect={() => setChoice(String(index))}
            />
          ))}
          <label className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2.5">
            <input
              type="radio"
              name="species"
              value={OTHER}
              checked={otherChosen}
              onChange={() => setChoice(OTHER)}
              className="h-5 w-5 accent-[var(--secondary-fixed)]"
            />
            <span className="type-label-lg text-primary">{result.candidates.length ? 'None of these' : 'Type the species'}</span>
          </label>
        </Surface>
        {canAskMore && (
          <button type="button" className={`${pill} self-start`} onClick={() => void showMoreOptions(result)} disabled={more === 'loading'}>
            <Icon name="expand-more" size={20} />
            {more === 'loading' ? 'Finding lookalikes…' : 'Show me more options'}
          </button>
        )}
        {more === 'done' && result.candidates.length === 1 && (
          <p className="type-body-sm text-on-surface-variant">Claude didn&rsquo;t find any likely lookalikes.</p>
        )}
        {moreError && <p role="alert" className="type-body-md text-error">{moreError}</p>}
        <p role="status" className="sr-only">{more === 'loading' ? 'Finding more options' : ''}</p>
        {otherChosen && (
          <div className="flex flex-col gap-1">
            <label htmlFor={ids.other} className="type-label-md text-on-surface-variant">Species name</label>
            <input id={ids.other} className={field} value={otherName} onChange={(event) => setOtherName(event.target.value)} autoComplete="off" />
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.when} className="type-label-lg text-primary">When</label>
        <input id={ids.when} type="datetime-local" className={field} value={when} onChange={(event) => setWhen(event.target.value)} required />
        {!result.time && <p className="type-body-sm text-on-surface-variant">No time in your note, so it&rsquo;s set to noon. Change it if you know.</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.where} className="type-label-lg text-primary">Where</label>
        <input id={ids.where} className={field} value={where} onChange={(event) => setWhere(event.target.value)} placeholder="Place name" />
        {showMapPoint && (
          <label className="flex min-h-11 items-center gap-2 type-body-sm text-on-surface-variant">
            <input type="checkbox" checked={useMapPoint} onChange={(event) => setUseMapPoint(event.target.checked)} className="h-5 w-5" />
            Use map point: {result.place.mapLabel}
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={ids.count} className="type-label-lg text-primary">How many</label>
        <input
          id={ids.count}
          type="number"
          inputMode="numeric"
          min={1}
          className={`${field} max-w-28`}
          value={count}
          onChange={(event) => setCount(Number(event.target.value) || 1)}
        />
      </div>

      <button type="submit" className={primary} disabled={!canSave || saving}>
        <Icon name="check" size={22} />
        {saving ? 'Saving…' : 'Add to my log'}
      </button>
      <button type="button" className={pill} onClick={() => setStep({ name: 'describe' })} disabled={saving}>
        Back
      </button>
    </form>
  );
}
