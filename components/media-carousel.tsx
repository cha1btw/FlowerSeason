"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";

export type CarouselItem = {
  src: string;
  alt: string;
  type?: "image" | "video";
  poster?: string;
  title?: string;
  caption?: string;
};

export function MediaCarousel({ items, label, inverse = false }: { items: readonly CarouselItem[]; label: string; inverse?: boolean }) {
  const track = useRef<HTMLDivElement>(null);

  function move(direction: number) {
    const element = track.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>("[data-carousel-card]");
    if (card) element.scrollBy({ left: direction * (card.offsetWidth + 16), behavior: "smooth" });
  }

  return (
    <div aria-label={label}>
      {items.length > 1 && (
        <div className="mb-4 flex justify-end gap-2">
          <button type="button" onClick={() => move(-1)} aria-label={`${label}: попередній кадр`} className={`grid size-11 place-items-center border ${inverse ? "border-white/40" : "border-ink/30"}`}><ArrowLeft size={18} /></button>
          <button type="button" onClick={() => move(1)} aria-label={`${label}: наступний кадр`} className={`grid size-11 place-items-center border ${inverse ? "border-white/40" : "border-ink/30"}`}><ArrowRight size={18} /></button>
        </div>
      )}
      <div ref={track} className="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, index) => (
          <article key={`${item.src}-${index}`} data-carousel-card className="w-[78vw] max-w-[440px] shrink-0 snap-start sm:w-[40vw] lg:w-[29vw]">
            <div className="relative aspect-[3/4] overflow-hidden bg-line">
              {item.type === "video" ? (
                <video src={item.src} poster={item.poster} aria-label={item.alt} className="size-full object-cover" muted playsInline controls preload="metadata" />
              ) : (
                <Image src={item.src} alt={item.alt} fill sizes="(max-width: 639px) 78vw, (max-width: 1023px) 40vw, 29vw" className="object-cover" />
              )}
            </div>
            {item.title && <h3 className="mt-3 text-lg font-light">{item.title}</h3>}
            {item.caption && <p className="mt-1 text-sm opacity-60">{item.caption}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
