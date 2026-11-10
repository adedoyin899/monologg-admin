import React, { useState } from "react";

interface PerformerInfo {
  name: string;
  fullName: string;
  avatarHash: string;
  imgClassName?: string;
  wrapperClassName?: string;
}

const PERFORMERS: PerformerInfo[] = [
  {
    name: "Theo",
    fullName: "Theo Olayanju",
    avatarHash: "6012d1b610f186b4da032a28a55bf16e19555e2e",
    imgClassName: "absolute h-[124.99%] left-0 max-w-none top-[0.88%] w-full object-cover",
    wrapperClassName: "absolute inset-0 overflow-hidden pointer-events-none rounded-full",
  },
  {
    name: "Olayinka",
    fullName: "Olayinka Olaseni",
    avatarHash: "7e479fe931474f554d58db81abed255122f1de16",
    imgClassName: "absolute inset-0 max-w-none object-cover pointer-events-none rounded-full size-full",
  },
  {
    name: "Deborah",
    fullName: "Deborah Ojengbede",
    avatarHash: "ce41249745f3e585f8d80fb1ce07d7acc7524c76",
    imgClassName: "absolute max-w-none object-cover rounded-full size-full",
    wrapperClassName: "absolute inset-0 pointer-events-none rounded-full bg-[#f8f8f6] dark:bg-[#1a1a1a]",
  },
  {
    name: "Bolu",
    fullName: "Bolu Olatunji",
    avatarHash: "27c7ee29f5252ea64f624a3fdfd8fa27d463ea10",
    imgClassName: "absolute inset-0 max-w-none object-cover pointer-events-none rounded-full size-full",
  },
  {
    name: "Gloria",
    fullName: "Gloria Sido",
    avatarHash: "89a561d69a1da9e8f1cff844db5a81f524163118",
    imgClassName: "absolute h-[150.06%] left-0 max-w-none top-[1.03%] w-full object-cover",
    wrapperClassName: "absolute inset-0 overflow-hidden pointer-events-none rounded-full",
  },
];

// Horizontal center of each avatar circle in px relative to the 172.3px container:
// Width: 46.457px, Overlap: -15px -> Step: 31.457px.
// i = 0: 23.23px, i = 1: 54.69px, i = 2: 86.14px, i = 3: 117.60px, i = 4: 149.06px
const AVATAR_CENTERS = [23.23, 54.69, 86.14, 117.6, 149.06];

export interface PerformerAvatarRowProps {
  className?: string;
  assetPrefix?: "home" | "pricing";
  "data-node-id"?: string;
}

export function PerformerAvatarRow({
  className = "",
  assetPrefix = "home",
  "data-node-id": dataNodeId = "178450:156007",
}: PerformerAvatarRowProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={`relative inline-flex flex-col items-center select-none pt-7 -mt-7 ${className}`}
      data-node-id={dataNodeId}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {/* Floating handwritten performer names row (Figma 178450:156023) */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 w-[172.3px] h-6 pointer-events-none flex items-center"
        data-node-id="178450:156023"
      >
        {PERFORMERS.map((performer, index) => {
          const isVisible = hoveredIndex === index;
          return (
            <span
              key={performer.name}
              data-testid={`performer-name-${index}`}
              className={`absolute -translate-x-1/2 whitespace-nowrap font-['Caveat',cursive] font-bold text-[18px] sm:text-[19px] leading-none tracking-[-0.02em] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${
                isVisible
                  ? "opacity-100 translate-y-0 scale-100 text-[#16161a] dark:text-[#f9f9f9]"
                  : "opacity-0 translate-y-1 scale-90"
              }`}
              style={{ left: `${AVATAR_CENTERS[index]}px` }}
            >
              {performer.name}
            </span>
          );
        })}
      </div>

      {/* 5 Overlapping Performer Avatars with hover focus + blur (Figma 178450:156007) */}
      <div className="flex isolate items-start relative shrink-0">
        {PERFORMERS.map((performer, index) => {
          const isHovered = hoveredIndex === index;
          const isAnyHovered = hoveredIndex !== null;
          const isBlurred = isAnyHovered && !isHovered;
          const naturalZ = 5 - index; // z-[5] down to z-[1]
          const isLast = index === PERFORMERS.length - 1;
          const assetSrc = `/assets/${assetPrefix}/${performer.avatarHash}.png`;

          return (
            <div
              key={performer.name}
              role="button"
              tabIndex={0}
              aria-label={`Performer: ${performer.fullName}`}
              data-testid={`performer-avatar-${index}`}
              onMouseEnter={() => setHoveredIndex(index)}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex(null)}
              onClick={() => setHoveredIndex(isHovered ? null : index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setHoveredIndex(isHovered ? null : index);
                }
              }}
              style={{
                zIndex: isHovered ? 30 : naturalZ,
              }}
              className={`relative size-[46.457px] rounded-full p-[11.614px] flex items-center justify-center border-[0.363px] border-solid shrink-0 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                !isLast ? "mr-[-15px]" : ""
              } ${
                isHovered
                  ? "scale-[1.08] filter-none opacity-100 shadow-[0_6px_16px_rgba(0,0,0,0.18)] border-[#d4d4d4] dark:border-[#404040]"
                  : isBlurred
                  ? "blur-[2px] scale-[0.98] opacity-60 border-[#e5e5e5] dark:border-[#1a1a1a]"
                  : "filter-none scale-100 opacity-100 border-[#e5e5e5] dark:border-[#1a1a1a]"
              }`}
            >
              {performer.wrapperClassName ? (
                <div className={performer.wrapperClassName}>
                  <img
                    alt={performer.fullName}
                    className={performer.imgClassName}
                    src={assetSrc}
                  />
                </div>
              ) : (
                <img
                  alt={performer.fullName}
                  className={performer.imgClassName}
                  src={assetSrc}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
