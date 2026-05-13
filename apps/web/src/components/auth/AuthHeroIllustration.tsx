/**
 * Hero illustration for auth pages — entrepreneur at laptop with floating
 * planning, analytics, social, and AI UI motifs. Inline SVG for crisp scaling.
 */
export default function AuthHeroIllustration({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-hidden={true}
    >
      <defs>
        <linearGradient
          id="authHero-bg"
          x1="40"
          y1="0"
          x2="360"
          y2="520"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f8fafc" />
          <stop offset="0.45" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient
          id="authHero-desk"
          x1="200"
          y1="380"
          x2="200"
          y2="520"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#cbd5e1" stopOpacity="0.35" />
          <stop offset="1" stopColor="#94a3b8" stopOpacity="0.5" />
        </linearGradient>
        <linearGradient
          id="authHero-screen"
          x1="168"
          y1="312"
          x2="232"
          y2="368"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#ecfdf5" />
          <stop offset="1" stopColor="#d1fae5" />
        </linearGradient>
        <filter
          id="authHero-float"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
          filterUnits="objectBoundingBox"
        >
          <feDropShadow
            dx="0"
            dy="6"
            stdDeviation="8"
            floodColor="#0f172a"
            floodOpacity="0.08"
          />
        </filter>
      </defs>

      <rect width="400" height="520" fill="url(#authHero-bg)" />

      {/* Ambient orbs */}
      <ellipse cx="72" cy="96" rx="56" ry="48" fill="#22c55e" opacity="0.06" />
      <ellipse cx="340" cy="140" rx="64" ry="52" fill="#3b82f6" opacity="0.05" />

      {/* Floating — Marketing plan */}
      <g filter="url(#authHero-float)">
        <rect
          x="24"
          y="44"
          width="112"
          height="86"
          rx="12"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <rect x="36" y="58" width="48" height="5" rx="2" fill="#0f172a" opacity="0.85" />
        <rect x="36" y="70" width="88" height="3" rx="1.5" fill="#64748b" opacity="0.35" />
        <rect x="36" y="78" width="72" height="3" rx="1.5" fill="#64748b" opacity="0.28" />
        <rect x="36" y="92" width="10" height="10" rx="2" fill="#22c55e" opacity="0.9" />
        <rect x="52" y="95" width="64" height="3" rx="1.5" fill="#64748b" opacity="0.4" />
        <rect x="36" y="106" width="10" height="10" rx="2" stroke="#cbd5e1" strokeWidth="1.2" />
        <rect x="52" y="109" width="64" height="3" rx="1.5" fill="#64748b" opacity="0.35" />
        <rect x="36" y="48" width="52" height="6" rx="2" fill="#64748b" opacity="0.2" />
      </g>

      {/* Floating — Bar chart */}
      <g filter="url(#authHero-float)">
        <rect
          x="268"
          y="56"
          width="108"
          height="92"
          rx="12"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <rect x="282" y="124" width="14" height="28" rx="3" fill="#22c55e" opacity="0.85" />
        <rect x="302" y="108" width="14" height="44" rx="3" fill="#16a34a" opacity="0.75" />
        <rect x="322" y="116" width="14" height="36" rx="3" fill="#4ade80" opacity="0.7" />
        <rect x="342" y="96" width="14" height="56" rx="3" fill="#15803d" opacity="0.65" />
        <path
          d="M286 88 L318 76 L350 82"
          stroke="#0f172a"
          strokeOpacity="0.2"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="318" cy="76" r="3" fill="#22c55e" />
      </g>

      {/* Floating — Social preview */}
      <g filter="url(#authHero-float)">
        <rect
          x="248"
          y="188"
          width="124"
          height="96"
          rx="14"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <circle cx="268" cy="212" r="12" fill="#e2e8f0" />
        <rect x="288" y="204" width="68" height="4" rx="2" fill="#0f172a" opacity="0.75" />
        <rect x="288" y="214" width="52" height="3" rx="1.5" fill="#94a3b8" opacity="0.5" />
        <rect x="260" y="232" width="100" height="40" rx="6" fill="#f1f5f9" />
        <rect x="268" y="242" width="36" height="3" rx="1" fill="#64748b" opacity="0.45" />
        <rect x="268" y="250" width="84" height="3" rx="1" fill="#94a3b8" opacity="0.35" />
        <rect x="268" y="258" width="60" height="3" rx="1" fill="#94a3b8" opacity="0.3" />
      </g>

      {/* Floating — AI suggestion */}
      <g filter="url(#authHero-float)">
        <rect
          x="28"
          y="168"
          width="118"
          height="72"
          rx="12"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <path
          d="M44 190 L52 198 L44 206 M48 194 L48 202"
          stroke="#22c55e"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="48" cy="198" r="10" stroke="#22c55e" strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
        <rect x="64" y="182" width="70" height="4" rx="2" fill="#0f172a" opacity="0.8" />
        <rect x="64" y="192" width="62" height="3" rx="1.5" fill="#64748b" opacity="0.4" />
        <rect x="64" y="202" width="54" height="3" rx="1.5" fill="#64748b" opacity="0.32" />
        <rect x="64" y="218" width="48" height="14" rx="6" fill="#ecfdf5" stroke="#86efac" strokeWidth="1" />
        <rect x="72" y="223" width="32" height="4" rx="2" fill="#166534" opacity="0.35" />
      </g>

      {/* Floating — Analytics KPI */}
      <g filter="url(#authHero-float)">
        <rect
          x="272"
          y="312"
          width="104"
          height="78"
          rx="12"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1"
        />
        <rect x="284" y="324" width="36" height="5" rx="2" fill="#64748b" opacity="0.35" />
        <rect x="284" y="336" width="72" height="22" rx="4" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
        <path
          d="M292 348 L302 338 L312 348 L322 334 L332 340"
          stroke="#22c55e"
          strokeWidth="2.2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M284 378 Q300 368 316 372 T348 364"
          stroke="#22c55e"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Desk */}
      <path
        d="M0 420 C80 400 120 412 200 408 C280 404 320 392 400 408 L400 520 L0 520 Z"
        fill="url(#authHero-desk)"
      />

      {/* Entrepreneur */}
      <ellipse cx="208" cy="268" rx="36" ry="44" fill="#1e293b" opacity="0.92" />
      <path
        d="M176 288 Q168 340 172 388 L188 388 Q192 340 200 308 Q216 320 232 308 Q240 340 244 388 L260 388 Q268 340 252 288 Q232 272 208 268 Q184 272 176 288Z"
        fill="#334155"
      />
      <path
        d="M168 318 Q156 332 148 352 L162 358 Q172 338 180 328Z"
        fill="#475569"
      />
      <path
        d="M248 318 Q264 332 276 352 L262 358 Q250 338 240 328Z"
        fill="#475569"
      />

      {/* Laptop */}
      <rect x="152" y="332" width="112" height="72" rx="6" fill="#1e293b" />
      <rect x="158" y="338" width="100" height="56" rx="4" fill="url(#authHero-screen)" stroke="#059669" strokeOpacity="0.25" strokeWidth="1" />
      {/* Mini chart on screen */}
      <path
        d="M170 378 L182 368 L194 374 L206 360 L218 352 L230 358"
        stroke="#059669"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="170" y="348" width="24" height="3" rx="1" fill="#0f172a" opacity="0.35" />
      <path d="M148 404 H268 L264 412 H144 Z" fill="#475569" />
      <rect x="144" y="404" width="128" height="6" rx="2" fill="#64748b" />

      {/* Connection dots to AI */}
      <circle cx="124" cy="210" r="3" fill="#22c55e" opacity="0.5" />
      <circle cx="134" cy="198" r="2" fill="#22c55e" opacity="0.35" />
      <path
        d="M124 210 Q150 240 168 338"
        stroke="#22c55e"
        strokeOpacity="0.15"
        strokeWidth="1"
        strokeDasharray="3 4"
        fill="none"
      />
    </svg>
  );
}
