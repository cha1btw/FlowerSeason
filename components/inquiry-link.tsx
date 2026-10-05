"use client";

import type { MouseEvent, PropsWithChildren } from "react";
import type { InterestValue } from "@/lib/content";

type InquiryLinkProps = PropsWithChildren<{
  interest: InterestValue;
  className?: string;
}>;

export function InquiryLink({
  interest,
  children,
  className,
}: InquiryLinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    const url = new URL(window.location.href);
    url.searchParams.set("interest", interest);
    url.hash = "contact";
    window.history.replaceState({}, "", url);
    window.dispatchEvent(
      new CustomEvent("flowerseason:interest", { detail: interest }),
    );
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <a href={`?interest=${interest}#contact`} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
