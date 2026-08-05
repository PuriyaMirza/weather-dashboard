import type { ReactNode } from 'react';

export function CardFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  const titleId = `${title.toLowerCase().replaceAll(' ', '-')}-title`;

  return (
    <article className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-200/70" aria-labelledby={titleId}>
      <div>
        <h2 id={titleId} className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </article>
  );
}

export function CardState({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'error' }) {
  return (
    <div className={`flex min-h-40 flex-1 items-center justify-center rounded-2xl border border-dashed p-6 text-center text-sm ${tone === 'error' ? 'border-rose-300 bg-rose-50 text-rose-800' : 'border-slate-300 bg-slate-50 text-slate-600'}`} role={tone === 'error' ? 'alert' : 'status'}>
      {label}
    </div>
  );
}
