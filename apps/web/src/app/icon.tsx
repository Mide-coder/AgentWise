import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 7,
          background: "#22C55E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Shield */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L20 5.5V11C20 15.5 16.5 19.5 12 21C7.5 19.5 4 15.5 4 11V5.5L12 2Z"
            fill="white"
            opacity="0.9"
          />
          {/* Wallet inside shield */}
          <rect x="7" y="9" width="10" height="8" rx="1.5" fill="#22C55E" />
          <rect x="7" y="9" width="10" height="8" rx="1.5" fill="white" opacity="0.15" />
          <rect x="8.5" y="11" width="7" height="1.2" rx="0.6" fill="white" opacity="0.7" />
          <rect x="8.5" y="13.2" width="4.5" height="1.2" rx="0.6" fill="white" opacity="0.7" />
          <circle cx="15" cy="13.5" r="1" fill="#22C55E" />
        </svg>
        {/* Orange sparkle */}
        <div
          style={{
            position: "absolute",
            top: 1,
            right: 1,
            width: 8,
            height: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="8" height="8" viewBox="0 0 10 10">
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
