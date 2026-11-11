import { useId } from 'react';

interface MilanJerseyDorsalProps {
  dorsal: string | number;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

interface DigitDef {
  viewBox: string;
  path: string;
  shield: { x: number; y: number; w: number; h: number };
}

// Vectores exactos de dorsales oficiales AC Milan (Puma Kit):
// Geometría pura donde el escudo está matemáticamente centrado en el medio del blanco.
const DIGIT_DEFS: Record<string, DigitDef> = {
  '0': {
    viewBox: '0 0 76 120',
    path: 'M 38 10 C 18 10, 8 22, 8 44 L 8 74 C 8 96, 18 108, 38 108 C 58 108, 68 96, 68 74 L 68 44 C 68 22, 58 10, 38 10 Z M 38 32 C 46 32, 50 38, 50 48 L 50 70 C 50 80, 46 86, 38 86 C 30 86, 26 80, 26 70 L 26 48 C 26 38, 30 32, 38 32 Z',
    shield: { x: 32, y: 89, w: 12, h: 15 },
  },
  '1': {
    // Tallo vertical de x=26 a x=54 (ancho 28). Centro matemático = 40.0.
    // Escudo w=12 (x=34 a 46): margen izquierdo = 8.0, margen derecho = 8.0.
    viewBox: '0 0 64 120',
    path: 'M 12 36 C 12 26, 18 18, 28 13 L 38 10 L 54 10 L 54 108 L 26 108 L 26 38 L 12 36 Z',
    shield: { x: 34, y: 89, w: 12, h: 15 },
  },
  '2': {
    viewBox: '0 0 76 120',
    path: 'M 10 38 C 10 18, 22 10, 38 10 C 54 10, 66 18, 66 36 C 66 50, 56 64, 42 76 L 24 94 L 68 94 L 68 108 L 10 108 L 10 94 L 38 66 C 48 56, 52 46, 52 36 C 52 24, 46 22, 38 22 C 30 22, 24 26, 24 38 Z',
    shield: { x: 33, y: 94, w: 12, h: 13 },
  },
  '3': {
    viewBox: '0 0 76 120',
    path: 'M 12 10 L 66 10 L 66 22 L 44 48 C 48 47, 54 47, 58 50 C 64 56, 68 66, 68 78 C 68 96, 56 108, 38 108 C 20 108, 8 96, 8 80 L 22 80 C 22 90, 28 96, 38 96 C 48 96, 54 90, 54 78 C 54 68, 48 62, 38 62 L 28 62 L 28 50 L 46 22 L 12 22 Z',
    shield: { x: 32, y: 89, w: 12, h: 15 },
  },
  '4': {
    viewBox: '0 0 76 120',
    path: 'M 46 10 L 46 64 L 14 64 L 46 16 L 46 10 L 6 68 L 6 78 L 46 78 L 46 108 L 60 108 L 60 78 L 72 78 L 72 64 L 60 64 L 60 10 Z',
    shield: { x: 47, y: 89, w: 12, h: 15 },
  },
  '5': {
    viewBox: '0 0 76 120',
    path: 'M 14 10 L 64 10 L 64 22 L 26 22 L 24 50 C 28 46, 34 44, 40 44 C 56 44, 68 54, 68 76 C 68 96, 56 108, 38 108 C 20 108, 8 96, 8 78 L 22 78 C 22 88, 28 96, 38 96 C 48 96, 54 88, 54 76 C 54 64, 48 56, 38 56 C 30 56, 24 60, 24 68 L 10 68 Z',
    shield: { x: 32, y: 89, w: 12, h: 15 },
  },
  '6': {
    viewBox: '0 0 76 120',
    path: 'M 42 10 C 22 10, 10 24, 8 50 L 22 50 C 24 32, 30 22, 42 22 C 50 22, 56 26, 58 34 L 58 48 C 52 44, 46 42, 38 42 C 20 42, 8 56, 8 76 C 8 96, 20 108, 38 108 C 56 108, 68 96, 68 74 L 68 46 C 68 24, 56 10, 42 10 Z M 38 54 C 48 54, 54 62, 54 74 C 54 88, 48 96, 38 96 C 28 96, 22 88, 22 74 C 22 62, 28 54, 38 54 Z',
    shield: { x: 32, y: 89, w: 12, h: 15 },
  },
  '7': {
    viewBox: '0 0 76 120',
    path: 'M 10 10 L 68 10 L 68 22 L 38 108 L 24 108 L 52 22 L 10 22 Z',
    shield: { x: 25, y: 89, w: 12, h: 15 },
  },
  '8': {
    viewBox: '0 0 76 120',
    path: 'M 38 10 C 22 10, 12 20, 12 34 C 12 46, 20 54, 30 58 C 18 62, 8 72, 8 86 C 8 100, 20 108, 38 108 C 56 108, 68 100, 68 86 C 68 72, 58 62, 46 58 C 56 54, 64 46, 64 34 C 64 20, 54 10, 38 10 Z M 38 22 C 46 22, 50 26, 50 34 C 50 42, 46 48, 38 48 C 30 48, 26 42, 26 34 C 26 26, 30 22, 38 22 Z M 38 68 C 48 68, 54 74, 54 86 C 54 96, 48 98, 38 98 C 28 98, 22 96, 22 86 C 22 74, 28 68, 38 68 Z',
    shield: { x: 32, y: 89, w: 12, h: 15 },
  },
  '9': {
    viewBox: '0 0 76 120',
    path: 'M 34 110 C 54 110, 66 96, 68 70 L 54 70 C 52 88, 46 98, 34 98 C 26 98, 20 94, 18 86 L 18 72 C 24 76, 30 78, 38 78 C 56 78, 68 64, 68 44 C 68 24, 56 12, 38 12 C 20 12, 8 24, 8 46 L 8 74 C 8 96, 20 110, 34 110 Z M 38 66 C 28 66, 22 58, 22 46 C 22 32, 28 24, 38 24 C 48 24, 54 32, 54 46 C 54 58, 48 66, 38 66 Z',
    shield: { x: 42, y: 88, w: 12, h: 15 },
  },
};

export default function MilanJerseyDorsal({
  dorsal,
  className = '',
  size = 'hero',
}: MilanJerseyDorsalProps) {
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (!dorsal && dorsal !== 0) return null;

  const digits = String(dorsal).trim().split('');

  const heightClasses = {
    sm: 'h-10',
    md: 'h-16',
    lg: 'h-24',
    hero: 'h-28 sm:h-44 md:h-52',
  }[size];

  return (
    <div
      aria-hidden="true"
      className={`inline-flex items-center justify-center gap-1 sm:gap-2 select-none pointer-events-none ${heightClasses} ${className}`}
      style={{ overflow: 'visible' }}
    >
      {digits.map((digit, idx) => {
        const def = DIGIT_DEFS[digit] || DIGIT_DEFS['1'];
        const clipId = `milan-vector-clip-${baseId}-${idx}`;

        return (
          <svg
            key={idx}
            viewBox={def.viewBox}
            className="h-full w-auto select-none pointer-events-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.85)] drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Máscara que asegura que NINGÚN píxel del escudo salga del blanco */}
              <clipPath id={clipId}>
                <path d={def.path} fillRule="evenodd" />
              </clipPath>
            </defs>

            {/* Número en blanco sólido con contorno oscuro */}
            <path
              d={def.path}
              fill="#ffffff"
              stroke="#0a0a0a"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              fillRule="evenodd"
            />

            {/* Escudo del AC Milan: exactamente centrado en el medio del blanco */}
            <g clipPath={`url(#${clipId})`}>
              <image
                href="/escudo.png"
                x={def.shield.x}
                y={def.shield.y}
                width={def.shield.w}
                height={def.shield.h}
                preserveAspectRatio="xMidYMid meet"
              />
            </g>
          </svg>
        );
      })}
    </div>
  );
}
