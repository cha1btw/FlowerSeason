import type { ReactNode } from "react";

type SectionHeadingProps = {
  index: string;
  title: string;
  subtitle?: string;
  inverse?: boolean;
  trailing?: ReactNode;
};

export function SectionHeading({
  index,
  title,
  subtitle,
  inverse = false,
  trailing,
}: SectionHeadingProps) {
  return (
    <div
      className={`grid grid-cols-12 gap-y-8 border-t pt-6 ${
        inverse ? "border-white/25" : "border-line"
      }`}
    >
      <p className="col-span-3 text-xs tracking-[0.16em] sm:col-span-2">{index}</p>
      <div className="col-span-9 sm:col-span-7">
        <h2 className="text-[clamp(2.4rem,6vw,7.5rem)] font-light leading-[0.9] tracking-[-0.045em]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? (
        <div className="col-span-9 col-start-4 sm:col-span-3 sm:col-start-10">
          {trailing}
        </div>
      ) : null}
    </div>
  );
}
