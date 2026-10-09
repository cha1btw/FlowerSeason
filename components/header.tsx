"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { SiteContent } from "@/lib/content";

type HeaderProps = {
  brand: SiteContent["brand"];
  navigation: {
    openLabel: string;
    closeLabel: string;
    menuLabel: string;
    links: ReadonlyArray<{ label: string; href: string }>;
  };
  homeHref?: string;
};

export function Header({ brand, navigation, homeHref = "#top" }: HeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-canvas/90 text-ink backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:h-20 lg:px-12">
        <a
          href={homeHref}
          className="max-w-[14rem] text-[11px] font-medium leading-tight tracking-[0.16em] transition-opacity active:opacity-55 sm:max-w-none sm:text-xs"
          onClick={() => setOpen(false)}
        >
          {brand.name}
        </a>

        <nav aria-label={navigation.menuLabel} className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {navigation.links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-xs tracking-[0.14em] underline-offset-8 transition-opacity hover:opacity-55 focus-visible:underline"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="relative z-[60] grid size-11 place-items-center border border-line transition-colors active:bg-line lg:hidden"
          aria-label={open ? navigation.closeLabel : navigation.openLabel}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-50 flex min-h-[100dvh] flex-col bg-canvas px-5 pb-8 pt-24 lg:hidden"
        >
          <nav aria-label={navigation.menuLabel} className="my-auto">
            <ul className="divide-y divide-line border-y border-line">
              {navigation.links.map((link, index) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex items-baseline justify-between py-5 text-[clamp(2rem,11vw,4rem)] font-light leading-none tracking-[-0.035em] active:opacity-50"
                    onClick={() => setOpen(false)}
                  >
                    <span>{link.label}</span>
                    <span className="text-xs tracking-[0.16em]">0{index + 1}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <p className="text-[11px] tracking-[0.16em]">{brand.name}</p>
        </div>
      ) : null}
    </header>
  );
}
