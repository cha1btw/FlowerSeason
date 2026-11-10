"use client";

import { useLayoutEffect, useRef } from "react";

export function HeroTitle() {
  const first = useRef<HTMLSpanElement>(null);
  const second = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    let cancelled = false;
    const fit = () => {
      if (cancelled || !first.current || !second.current) return;
      second.current.style.fontSize = "1em";
      const firstWidth = first.current.getBoundingClientRect().width;
      const secondWidth = second.current.getBoundingClientRect().width;
      if (firstWidth && secondWidth) {
        second.current.style.fontSize = `${firstWidth / secondWidth}em`;
      }
    };

    fit();
    document.fonts.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <h1 className="w-fit max-w-full text-[clamp(2.8rem,9vw,10rem)] font-light leading-[0.95] tracking-normal">
      <span ref={first} className="block w-fit whitespace-nowrap">CHRISTMAS</span>
      <span ref={second} className="block w-fit whitespace-nowrap text-[0.5em]">BY FLOWER SEASON</span>
    </h1>
  );
}
