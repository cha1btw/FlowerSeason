"use client";

import Image from "next/image";
import { useState } from "react";

export type GalleryItem = { src: string; alt: string; type?: "video" | "image"; poster?: string };

function Frame({ item, priority = false }: { item: GalleryItem; priority?: boolean }) {
  if (item.type === "video") {
    return <video key={item.src} src={item.src} poster={item.poster} aria-label={item.alt} className="size-full object-cover" autoPlay muted loop playsInline controls preload="metadata" />;
  }
  return <Image src={item.src} alt={item.alt} fill priority={priority} sizes="(max-width: 640px) 100vw, 65vw" className="object-cover" />;
}

export function MediaGallery({ items, label }: { items: readonly GalleryItem[]; label: string }) {
  const [active, setActive] = useState(0);
  return (
    <div aria-label={label}>
      <div className="relative aspect-[3/4] overflow-hidden bg-line"><Frame item={items[active]} /></div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {items.map((item, index) => (
          <button key={item.src} type="button" aria-label={`${label}: ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)} className={`relative aspect-[3/4] overflow-hidden bg-line outline-offset-2 ${active === index ? "ring-2 ring-ink" : ""}`}>
            {item.type === "video" ? <><video src={item.src} poster={item.poster} muted playsInline preload="metadata" className="size-full object-cover" /><span className="absolute bottom-2 left-2 bg-ink/75 px-2 py-1 text-xs text-white">▶</span></> : <Image src={item.src} alt="" fill sizes="25vw" className="object-cover" />}
          </button>
        ))}
      </div>
    </div>
  );
}
