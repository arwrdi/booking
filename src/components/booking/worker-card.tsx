"use client";

import { useState } from "react";

type WorkerCardProps = {
  name: string;
  specialization?: string | null;
  bio?: string | null;
  photoUrl?: string | null;
  portfolioUrls?: string[];
  selected?: boolean;
  onSelect?: () => void;
  selectable?: boolean;
  footerNote?: string;
};

export function WorkerCard({
  name,
  specialization,
  bio,
  photoUrl,
  portfolioUrls = [],
  selected = false,
  onSelect,
  selectable = true,
  footerNote,
}: WorkerCardProps) {
  const [showPortfolio, setShowPortfolio] = useState(false);

  return (
    <>
      {/* Space for overlapping photo (~40% of card height sticks above) */}
      <div className="relative pt-[40%]">
        <div
          className={`relative flex aspect-square w-full flex-col overflow-visible rounded-[1.75rem] border transition-all ${
            selected
              ? "border-powder-strong bg-lilac-soft ring-2 ring-powder-strong/50"
              : "border-border bg-surface"
          }`}
        >
          {/* Foto ~80% dari lebar kotak, overlapping di atas */}
          <div className="pointer-events-none absolute left-1/2 top-0 z-10 w-[80%] -translate-x-1/2 -translate-y-[42%]">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={name}
                className="aspect-square w-full rounded-full border-4 border-surface object-cover shadow-[var(--shadow-soft)]"
              />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center rounded-full border-4 border-surface bg-powder text-3xl font-semibold text-white shadow-[var(--shadow-soft)] sm:text-4xl">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Area bawah: nama + portofolio (di dalam kotak) */}
          <div className="mt-auto flex flex-col items-center gap-2 px-3 pb-3 pt-[42%]">
            <button
              type="button"
              disabled={!selectable || !onSelect}
              onClick={onSelect}
              className={`w-full text-center ${
                selectable && onSelect ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <p className="line-clamp-1 font-display text-sm font-semibold leading-tight text-foreground sm:text-base">
                {name}
              </p>
              {specialization ? (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted sm:text-xs">
                  {specialization}
                </p>
              ) : null}
              {footerNote ? (
                <p className="mt-0.5 text-[10px] font-medium text-powder-strong">{footerNote}</p>
              ) : null}
              {selected ? (
                <span className="mt-1 inline-block rounded-full bg-powder-strong px-2 py-0.5 text-[10px] font-semibold text-white">
                  Dipilih
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPortfolio(true);
              }}
              className="flex h-9 w-full shrink-0 items-center justify-center rounded-full border border-border bg-lilac-soft/80 text-[11px] font-semibold text-powder-strong transition-colors hover:bg-lilac-soft sm:text-xs"
            >
              Portofolio
              {portfolioUrls.length > 0 ? ` (${portfolioUrls.length})` : ""}
            </button>
          </div>
        </div>
      </div>

      {showPortfolio ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowPortfolio(false)}
        >
          <div
            className="surface-card max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-xl font-semibold">{name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {specialization ?? "Portofolio worker"}
                </p>
                {bio ? <p className="mt-2 text-sm text-muted">{bio}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setShowPortfolio(false)}
                className="rounded-full bg-lilac-soft px-3 py-1 text-sm font-medium"
              >
                Tutup
              </button>
            </div>

            {portfolioUrls.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {portfolioUrls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={`Portofolio ${idx + 1}`}
                      className="aspect-square w-full rounded-2xl object-cover"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl bg-lilac-soft/60 p-6 text-center text-sm text-muted">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={name}
                    className="mx-auto mb-3 h-28 w-28 rounded-full object-cover"
                  />
                ) : null}
                Belum ada foto portofolio tambahan.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
