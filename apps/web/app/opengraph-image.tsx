import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 60,
        fontFamily: 'sans-serif',
      }}
    >
      {/* P + 시계 아이콘 (대형) */}
      <svg
        viewBox="0 0 24 24"
        width="220"
        height="220"
        fill="none"
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 21 L5 3 L13 3" strokeWidth="2.5" />
        <circle cx="13" cy="10" r="7" strokeWidth="2" />
        <line x1="5" y1="17" x2="13" y2="17" strokeWidth="2.5" />
        <line x1="13" y1="7.5" x2="13" y2="10" strokeWidth="1.8" />
        <line x1="13" y1="10" x2="15.5" y2="11.5" strokeWidth="1.8" />
        <circle cx="15.5" cy="11.5" r="1.2" fill="#ef4444" stroke="none" />
      </svg>

      {/* 텍스트 영역 */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: 'white',
            letterSpacing: '-2px',
            lineHeight: 1,
          }}
        >
          PomoRoutine
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#94a3b8',
            lineHeight: 1.4,
          }}
        >
          포모도로 타이머
        </div>
        <div
          style={{
            fontSize: 26,
            color: '#64748b',
          }}
        >
          집중하고, 기록하고, 분석하세요
        </div>
      </div>
    </div>,
    { ...size },
  );
}
