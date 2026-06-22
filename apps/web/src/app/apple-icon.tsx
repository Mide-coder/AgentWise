import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "#22C55E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Shield */}
        <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L20 5.5V11C20 15.5 16.5 19.5 12 21C7.5 19.5 4 15.5 4 11V5.5L12 2Z"
            fill="white"
          />
          {/* Wallet cards fanning out */}
          <path d="M9 7.5 L15 6.5 L15.5 8.5 L9.5 9.5Z" fill="#22C55E" opacity="0.6" />
          <path d="M9 8.5 L15 7.8 L15.3 9.5 L9.2 10.2Z" fill="#22C55E" opacity="0.8" />
          {/* Wallet body */}
          <rect x="7" y="10" width="10" height="8" rx="1.5" fill="#22C55E" />
          <circle cx="15.2" cy="14" r="1.2" fill="white" opacity="0.8" />
          <rect x="8" y="12.5" width="5" height="1" rx="0.5" fill="white" opacity="0.6" />
        </svg>
        {/* Orange sparkle */}
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 34,
            height: 34,
          }}
        >
          <svg width="34" height="34" viewBox="0 0 10 10">
            <path
              d="M5 0 Q5.8 3.5 9 5 Q5.8 6.5 5 10 Q4.2 6.5 1 5 Q4.2 3.5 5 0Z"
              fill="#F97316"
            />
          </svg>
        </div>
      </div>
    ),
    { ...size }
  );
}
