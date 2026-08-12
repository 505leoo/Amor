import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Ellipse, Rect, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

const TRACK_H = 360;
const PATH_Y = TRACK_H - 128;

// Suaviza 0→1 entre dos fracciones del canvas
const easeIn  = (x, tw, a, b) => { const t = Math.max(0, Math.min(1, (x / tw - a) / (b - a))); return t * t; };
const easeOut = (x, tw, a, b) => { const t = Math.max(0, Math.min(1, (x / tw - a) / (b - a))); return 1 - (1 - t) * (1 - t); };
const fadeIn  = (x, tw, a, b) => Math.max(0, Math.min(1, (x / tw - a) / (b - a)));
const fadeOut = (x, tw, a, b) => 1 - fadeIn(x, tw, a, b);

// ─── PARTE 1: CIELO + SOL ────────────────────────────────────────────────────

const SUN_R = 72;
const SUN_RAYS = Array.from({ length: 36 }, (_, i) => {
  const angle = -174 + (i * 180) / 35;
  const rad   = (angle * Math.PI) / 180;
  const inner = SUN_R + 6;
  const outer = SUN_R + 28 + (i % 3) * 8;
  return {
    cos: Math.cos(rad),
    sin: Math.sin(rad),
    inner,
    outer,
    op: i % 4 === 0 ? 0.65 : i % 3 === 0 ? 0.45 : i % 2 === 0 ? 0.30 : 0.20,
    sw: i % 5 === 0 ? 2.8  : i % 3 === 0 ? 1.8  : 1.1,
  };
});

export const CieloYSol = ({ totalW }) => {
  const sunX = totalW * 0.13;
  const sunY = TRACK_H - 120 - SUN_R;

  return (
    <React.Fragment>
      <Defs>
        <LinearGradient id="skyH" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#ffe484" />
          <Stop offset="22%"  stopColor="#ffcf5c" />
          <Stop offset="45%"  stopColor="#f4a96a" />
          <Stop offset="68%"  stopColor="#c9b8e8" />
          <Stop offset="100%" stopColor="#7080c0" />
        </LinearGradient>
        <LinearGradient id="skyV" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%"   stopColor="rgba(255,255,255,0.0)" />
          <Stop offset="55%"  stopColor="rgba(255,180,60,0.12)" />
          <Stop offset="100%" stopColor="rgba(180,90,20,0.30)" />
        </LinearGradient>
        <RadialGradient id="glow1" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor="rgba(255,255,220,0.00)" />
          <Stop offset="40%"  stopColor="rgba(255,245,150,0.28)" />
          <Stop offset="100%" stopColor="rgba(255,200,40,0.00)" />
        </RadialGradient>
        <RadialGradient id="glow2" cx="50%" cy="50%" r="50%">
          <Stop offset="0%"   stopColor="rgba(255,250,180,0.00)" />
          <Stop offset="45%"  stopColor="rgba(255,235,100,0.14)" />
          <Stop offset="100%" stopColor="rgba(255,190,20,0.00)" />
        </RadialGradient>
        <RadialGradient id="sunDisc" cx="45%" cy="38%" r="60%">
          <Stop offset="0%"   stopColor="#ffffff" />
          <Stop offset="35%"  stopColor="#fffbe0" />
          <Stop offset="75%"  stopColor="#ffe566" />
          <Stop offset="100%" stopColor="#ffd030" />
        </RadialGradient>
      </Defs>

      {/* Cielo base */}
      <Rect x={0} y={0} width={totalW} height={TRACK_H} fill="url(#skyH)" />
      <Rect x={0} y={0} width={totalW} height={TRACK_H} fill="url(#skyV)" />

      {/* Resplandor difuso — 2 capas */}
      <Circle cx={sunX} cy={sunY} r={SUN_R * 1.5} fill="url(#glow1)" opacity={0.90} />
      <Circle cx={sunX} cy={sunY} r={SUN_R * 2.0} fill="url(#glow2)" opacity={0.80} />

      {/* Destellos estáticos — semicírculo superior */}
      {SUN_RAYS.map((r, i) => (
        <Path
          key={`ray-${i}`}
          d={`M${sunX + r.cos * r.inner} ${sunY + r.sin * r.inner} L${sunX + r.cos * r.outer} ${sunY + r.sin * r.outer}`}
          stroke={`rgba(255,240,110,${r.op})`}
          strokeWidth={r.sw}
          strokeLinecap="round"
        />
      ))}

      {/* Disco principal */}
      <Circle cx={sunX} cy={sunY} r={SUN_R} fill="url(#sunDisc)" opacity={0.98} />
      <Circle cx={sunX} cy={sunY} r={SUN_R + 5} fill="none" stroke="rgba(255,245,120,0.22)" strokeWidth={5} />
      <Ellipse cx={sunX - 12} cy={sunY - 14} rx={16} ry={11} fill="rgba(255,255,255,0.50)" />
      <Ellipse cx={sunX - 6}  cy={sunY - 8}  rx={7}  ry={5}  fill="rgba(255,255,255,0.68)" />

      {/* Partículas doradas */}
      {[
        { ax: 0.02, y: 22,  r: 2.0 }, { ax: 0.05, y: 68,  r: 1.8 }, { ax: 0.08, y: 40,  r: 2.2 },
        { ax: 0.11, y: 110, r: 1.7 }, { ax: 0.14, y: 55,  r: 2.1 }, { ax: 0.17, y: 90,  r: 1.9 },
        { ax: 0.20, y: 30,  r: 2.3 }, { ax: 0.23, y: 125, r: 1.8 }, { ax: 0.26, y: 18,  r: 2.0 },
        { ax: 0.29, y: 75,  r: 2.2 }, { ax: 0.32, y: 48,  r: 1.9 }, { ax: 0.35, y: 105, r: 2.1 },
      ].map((p, i) => {
        const px = totalW * p.ax;
        const baseOp = 0.35 + (i % 3) * 0.08;
        const op = fadeOut(px, totalW, 0.24, 0.44) * baseOp;
        if (op < 0.02) return null;
        const cols = ['rgba(255,235,90,X)', 'rgba(255,215,60,X)', 'rgba(255,250,160,X)'];
        const fill = cols[i % 3].replace('X', op.toFixed(2));
        return <Circle key={`p-${i}`} cx={px} cy={p.y} r={p.r} fill={fill} />;
      })}
    </React.Fragment>
  );
};

// ─── PARTE 2: NUBES ACUARELA ─────────────────────────────────────────────────
// Cada nube es única: capas de elipses con opacidades muy bajas superpuestas
// Aparecen desde la derecha (fade in 0.28→0.42) y se van hacia la izquierda (fade out 0.62→0.78)

const NubeAcuarela = ({ cx, cy, sc, col, op, variant }) => {
  if (op <= 0.01) return null;

  // Cada variante es una forma de nube distinta
  if (variant === 0) return ( // Nube esponjosa clásica
    <React.Fragment>
      <Ellipse cx={cx}        cy={cy + 4}  rx={58 * sc} ry={16 * sc} fill={col} opacity={op * 0.22} />
      <Ellipse cx={cx - 2}    cy={cy + 2}  rx={52 * sc} ry={18 * sc} fill={col} opacity={op * 0.22} />
      <Ellipse cx={cx}        cy={cy}      rx={46 * sc} ry={20 * sc} fill={col} opacity={op * 0.28} />
      <Ellipse cx={cx - 16 * sc} cy={cy - 6 * sc} rx={26 * sc} ry={18 * sc} fill={col} opacity={op * 0.32} />
      <Ellipse cx={cx + 14 * sc} cy={cy - 4 * sc} rx={22 * sc} ry={16 * sc} fill={col} opacity={op * 0.30} />
      <Circle  cx={cx - 8 * sc}  cy={cy - 12 * sc} r={16 * sc} fill={col} opacity={op * 0.35} />
      <Circle  cx={cx + 6 * sc}  cy={cy - 10 * sc} r={14 * sc} fill={col} opacity={op * 0.32} />
      <Circle  cx={cx}           cy={cy - 16 * sc} r={11 * sc} fill="#fff"  opacity={op * 0.28} />
      <Ellipse cx={cx - 4 * sc}  cy={cy - 10 * sc} rx={10 * sc} ry={5 * sc} fill="#fff" opacity={op * 0.20} />
    </React.Fragment>
  );
  if (variant === 1) return ( // Nube alargada y baja
    <React.Fragment>
      <Ellipse cx={cx}           cy={cy + 6}  rx={70 * sc} ry={12 * sc} fill={col} opacity={op * 0.15} />
      <Ellipse cx={cx}           cy={cy + 3}  rx={62 * sc} ry={15 * sc} fill={col} opacity={op * 0.20} />
      <Ellipse cx={cx}           cy={cy}      rx={55 * sc} ry={14 * sc} fill={col} opacity={op * 0.28} />
      <Ellipse cx={cx - 20 * sc} cy={cy - 5 * sc} rx={24 * sc} ry={15 * sc} fill={col} opacity={op * 0.30} />
      <Ellipse cx={cx + 18 * sc} cy={cy - 4 * sc} rx={20 * sc} ry={13 * sc} fill={col} opacity={op * 0.28} />
      <Ellipse cx={cx - 2 * sc}  cy={cy - 9 * sc} rx={16 * sc} ry={10 * sc} fill={col} opacity={op * 0.32} />
      <Ellipse cx={cx - 6 * sc}  cy={cy - 7 * sc} rx={9 * sc}  ry={5 * sc}  fill="#fff" opacity={op * 0.22} />
    </React.Fragment>
  );
  if (variant === 2) return ( // Nube compacta y alta
    <React.Fragment>
      <Ellipse cx={cx}           cy={cy + 5}  rx={36 * sc} ry={14 * sc} fill={col} opacity={op * 0.20} />
      <Ellipse cx={cx}           cy={cy + 2}  rx={30 * sc} ry={16 * sc} fill={col} opacity={op * 0.26} />
      <Circle  cx={cx - 10 * sc} cy={cy - 4 * sc} r={18 * sc} fill={col} opacity={op * 0.30} />
      <Circle  cx={cx + 8 * sc}  cy={cy - 2 * sc} r={16 * sc} fill={col} opacity={op * 0.28} />
      <Circle  cx={cx}           cy={cy - 10 * sc} r={14 * sc} fill={col} opacity={op * 0.32} />
      <Circle  cx={cx - 4 * sc}  cy={cy - 16 * sc} r={10 * sc} fill={col} opacity={op * 0.30} />
      <Circle  cx={cx}           cy={cy - 18 * sc} r={7 * sc}  fill="#fff" opacity={op * 0.25} />
      <Ellipse cx={cx - 2 * sc}  cy={cy - 12 * sc} rx={8 * sc} ry={4 * sc} fill="#fff" opacity={op * 0.18} />
    </React.Fragment>
  );
  // variant === 3: nube grande con muchos pompones
  return (
    <React.Fragment>
      <Ellipse cx={cx}           cy={cy + 6}  rx={72 * sc} ry={18 * sc} fill={col} opacity={op * 0.14} />
      <Ellipse cx={cx}           cy={cy + 3}  rx={64 * sc} ry={20 * sc} fill={col} opacity={op * 0.18} />
      <Ellipse cx={cx}           cy={cy}      rx={56 * sc} ry={18 * sc} fill={col} opacity={op * 0.24} />
      <Ellipse cx={cx - 24 * sc} cy={cy - 2 * sc} rx={30 * sc} ry={18 * sc} fill={col} opacity={op * 0.28} />
      <Ellipse cx={cx + 22 * sc} cy={cy - 2 * sc} rx={26 * sc} ry={16 * sc} fill={col} opacity={op * 0.26} />
      <Circle  cx={cx - 16 * sc} cy={cy - 14 * sc} r={18 * sc} fill={col} opacity={op * 0.30} />
      <Circle  cx={cx + 10 * sc} cy={cy - 12 * sc} r={16 * sc} fill={col} opacity={op * 0.28} />
      <Circle  cx={cx - 2 * sc}  cy={cy - 18 * sc} r={14 * sc} fill={col} opacity={op * 0.32} />
      <Circle  cx={cx + 24 * sc} cy={cy - 8 * sc}  r={12 * sc} fill={col} opacity={op * 0.26} />
      <Circle  cx={cx - 28 * sc} cy={cy - 6 * sc}  r={10 * sc} fill={col} opacity={op * 0.24} />
      <Circle  cx={cx}           cy={cy - 22 * sc} r={10 * sc} fill="#fff" opacity={op * 0.22} />
      <Ellipse cx={cx - 8 * sc}  cy={cy - 16 * sc} rx={12 * sc} ry={6 * sc} fill="#fff" opacity={op * 0.16} />
    </React.Fragment>
  );
};

// Datos de nubes: ax=posición fraccionaria, y=altura, s=escala, v=variante, col=color base
const CLOUD_DATA = [
  // Primera oleada — entran suavemente
  { ax: 0.30, y: 52,  s: 1.10, v: 3, col: '#fff8f0' },
  { ax: 0.35, y: 28,  s: 0.90, v: 0, col: '#ffffff' },
  { ax: 0.40, y: 78,  s: 1.00, v: 1, col: '#fff4ec' },
  { ax: 0.45, y: 38,  s: 1.20, v: 2, col: '#ffffff' },
  // Segunda oleada — más densas
  { ax: 0.50, y: 62,  s: 0.85, v: 0, col: '#fff8f2' },
  { ax: 0.54, y: 22,  s: 1.05, v: 3, col: '#ffffff' },
  { ax: 0.58, y: 88,  s: 0.95, v: 1, col: '#fff6f0' },
  { ax: 0.62, y: 44,  s: 1.15, v: 2, col: '#ffffff' },
  // Nubes bajas cerca del horizonte
  { ax: 0.32, y: 118, s: 1.30, v: 1, col: '#fff0e8' },
  { ax: 0.42, y: 112, s: 1.10, v: 3, col: '#ffffff' },
  { ax: 0.52, y: 122, s: 1.20, v: 0, col: '#fff4ee' },
  { ax: 0.62, y: 116, s: 1.00, v: 2, col: '#ffffff' },
];

export const NubesAcuarela = ({ totalW }) => (
  <React.Fragment>
    {CLOUD_DATA.map((c, i) => {
      const cx = totalW * c.ax;
      // Fade in: aparecen desde la derecha (0.26→0.40)
      // Fade out: se van hacia la izquierda (0.60→0.76)
      const opIn  = easeOut(cx, totalW, 0.26, 0.40);
      const opOut = 1 - easeIn(cx, totalW, 0.60, 0.76);
      const op = Math.max(0, Math.min(1, opIn * opOut));
      return (
        <NubeAcuarela
          key={`nube-${i}`}
          cx={cx} cy={c.y}
          sc={c.s} col={c.col}
          op={op} variant={c.v}
        />
      );
    })}
  </React.Fragment>
);

// ─── PARTE 3: PÁJAROS + ESTRELLAS ────────────────────────────────────────────

// Pájaro acuarela: silueta minimalista con trazo muy suave, casi etéreo
const PajaroAcuarela = ({ bx, by, s, op }) => {
  if (op <= 0.01) return null;
  const w = 13 * s;
  const h = 6  * s;
  // Trazo principal del ala izquierda — curva suave
  const stroke = `rgba(60,40,80,${(op * 0.55).toFixed(2)})`;
  const strokeThin = `rgba(80,60,100,${(op * 0.28).toFixed(2)})`;
  return (
    <React.Fragment>
      {/* Sombra difusa acuarela debajo del pájaro */}
      <Ellipse cx={bx} cy={by + 3} rx={w * 0.9} ry={2.5 * s} fill={`rgba(60,40,80,${(op * 0.08).toFixed(2)})`} />
      {/* Ala izquierda */}
      <Path
        d={`M${bx} ${by} C${bx - w * 0.5} ${by - h * 1.2}, ${bx - w * 1.0} ${by - h * 0.6}, ${bx - w * 1.25} ${by + h * 0.15}`}
        stroke={stroke} strokeWidth={1.6 * s} fill="none" strokeLinecap="round"
      />
      {/* Ala derecha */}
      <Path
        d={`M${bx} ${by} C${bx + w * 0.4} ${by - h * 1.0}, ${bx + w * 0.85} ${by - h * 0.4}, ${bx + w * 1.05} ${by + h * 0.15}`}
        stroke={stroke} strokeWidth={1.6 * s} fill="none" strokeLinecap="round"
      />
      {/* Detalle interior ala izquierda — línea más fina */}
      <Path
        d={`M${bx - w * 0.1} ${by - h * 0.1} C${bx - w * 0.45} ${by - h * 0.9}, ${bx - w * 0.85} ${by - h * 0.45}, ${bx - w * 1.0} ${by + h * 0.05}`}
        stroke={strokeThin} strokeWidth={0.9 * s} fill="none" strokeLinecap="round"
      />
    </React.Fragment>
  );
};

const BIRD_DATA = [
  // Bandada principal — altura media, tamaños variados
  { ax: 0.67, y: 52,  s: 0.95 },
  { ax: 0.70, y: 38,  s: 0.70 },
  { ax: 0.72, y: 64,  s: 1.10 },
  { ax: 0.74, y: 30,  s: 0.55 },
  { ax: 0.76, y: 72,  s: 0.85 },
  { ax: 0.78, y: 44,  s: 0.65 },
  { ax: 0.80, y: 58,  s: 1.00 },
  { ax: 0.82, y: 34,  s: 0.75 },
  { ax: 0.84, y: 80,  s: 0.60 },
  { ax: 0.86, y: 48,  s: 0.90 },
  { ax: 0.88, y: 26,  s: 0.50 },
  { ax: 0.90, y: 66,  s: 0.80 },
  { ax: 0.92, y: 42,  s: 0.65 },
  { ax: 0.94, y: 56,  s: 0.95 },
  { ax: 0.96, y: 36,  s: 0.55 },
  { ax: 0.98, y: 70,  s: 0.75 },
  // Bandada alta — muy pequeños, casi invisibles, dan profundidad
  { ax: 0.68, y: 16,  s: 0.38 },
  { ax: 0.73, y: 12,  s: 0.32 },
  { ax: 0.78, y: 20,  s: 0.42 },
  { ax: 0.83, y: 10,  s: 0.30 },
  { ax: 0.88, y: 18,  s: 0.36 },
  { ax: 0.93, y: 14,  s: 0.34 },
  { ax: 0.98, y: 22,  s: 0.40 },
  // Rezagados solitarios — más separados
  { ax: 0.75, y: 90,  s: 0.48 },
  { ax: 0.87, y: 96,  s: 0.44 },
  { ax: 0.96, y: 88,  s: 0.52 },
];

// Estrella acuarela: punto con halo difuso
const EstrellaAcuarela = ({ sx, sy, r, op }) => {
  if (op <= 0.01) return null;
  return (
    <React.Fragment>
      <Circle cx={sx} cy={sy} r={r * 3.5} fill={`rgba(200,210,255,${(op * 0.12).toFixed(2)})`} />
      <Circle cx={sx} cy={sy} r={r * 1.8} fill={`rgba(220,230,255,${(op * 0.30).toFixed(2)})`} />
      <Circle cx={sx} cy={sy} r={r}       fill={`rgba(255,255,255,${(op * 0.75).toFixed(2)})`} />
    </React.Fragment>
  );
};

const STAR_DATA = [
  { ax: 0.68, y: 18,  r: 1.4 }, { ax: 0.71, y: 42,  r: 1.1 }, { ax: 0.74, y: 8,   r: 1.6 },
  { ax: 0.77, y: 30,  r: 1.2 }, { ax: 0.80, y: 55,  r: 1.0 }, { ax: 0.83, y: 14,  r: 1.5 },
  { ax: 0.86, y: 38,  r: 1.3 }, { ax: 0.89, y: 6,   r: 1.1 }, { ax: 0.92, y: 48,  r: 1.4 },
  { ax: 0.95, y: 22,  r: 1.2 }, { ax: 0.98, y: 34,  r: 1.0 }, { ax: 0.70, y: 62,  r: 0.9 },
  { ax: 0.76, y: 10,  r: 1.3 }, { ax: 0.82, y: 70,  r: 1.0 }, { ax: 0.91, y: 26,  r: 1.5 },
  { ax: 0.97, y: 58,  r: 1.1 }, { ax: 0.73, y: 78,  r: 0.9 }, { ax: 0.85, y: 4,   r: 1.2 },
];

export const PajarosYEstrellas = ({ totalW }) => (
  <React.Fragment>
    {/* Estrellas — aparecen muy suavemente en zona 3 */}
    {STAR_DATA.map((st, i) => {
      const sx = totalW * st.ax;
      const op = easeOut(sx, totalW, 0.66, 0.82) * 0.85;
      return <EstrellaAcuarela key={`star-${i}`} sx={sx} sy={st.y} r={st.r} op={op} />;
    })}
    {/* Pájaros */}
    {BIRD_DATA.map((b, i) => {
      const bx = totalW * b.ax;
      // Fade in suave, los más pequeños aparecen un poco más tarde
      const delay = b.s < 0.45 ? 0.04 : 0;
      const op = easeOut(bx, totalW, 0.65 + delay, 0.80 + delay);
      return <PajaroAcuarela key={`bird-${i}`} bx={bx} by={b.y} s={b.s} op={op} />;
    })}
  </React.Fragment>
);

// ─── PARTE 4: TERRENO + RÍO + ENSAMBLADO ─────────────────────────────────────

export const Camino = ({ total, totalW }) => {
  const roadY = PATH_Y;
  const stones = Array.from({ length: 30 }, (_, i) => ({
    x: 90 + i * (totalW / 30),
    y: roadY + 12 + (i % 5) * 5,
  }));
  return (
    <Svg width={totalW} height={TRACK_H} style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
      <Defs>
        <LinearGradient id="caminoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <Stop offset="0%"   stopColor="#7a4a22" />
          <Stop offset="50%"  stopColor="#5d371c" />
          <Stop offset="100%" stopColor="#4a2e18" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={roadY - 6}  width={totalW} height={118} fill="url(#caminoGrad)" opacity={0.95} />
      <Rect x={0} y={roadY + 2}  width={totalW} height={20}  fill="#7f4b21" />
      <Rect x={0} y={roadY + 22} width={totalW} height={30}  fill="#a96c36" />
      <Rect x={0} y={roadY + 52} width={totalW} height={24}  fill="#6f3f1d" opacity={0.82} />
      <Path d={`M0 ${roadY + 16} H${totalW}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} />
      <Path d={`M0 ${roadY + 40} H${totalW}`} stroke="rgba(255,255,255,0.15)" strokeWidth={2} strokeDasharray="10 8" />
      {stones.map((st, i) => (
        <Ellipse key={`st-${i}`} cx={st.x} cy={st.y} rx={4.4} ry={2.9} fill="rgba(255,255,255,0.18)" />
      ))}
    </Svg>
  );
};

const Terreno = ({ totalW }) => (
  <React.Fragment>
    <Defs>
      <LinearGradient id="groundG" x1="0%" y1="0%" x2="0%" y2="100%">
        <Stop offset="0%"   stopColor="#76c35f" />
        <Stop offset="100%" stopColor="#3e7d4b" />
      </LinearGradient>
      <LinearGradient id="riverG" x1="0%" y1="0%" x2="100%" y2="0%">
        <Stop offset="0%"   stopColor="#4a8fc0" />
        <Stop offset="40%"  stopColor="#6ab8e8" />
        <Stop offset="100%" stopColor="#9ad4f5" />
      </LinearGradient>
    </Defs>
    {/* Colinas acuarela — capas superpuestas con opacidades bajas */}
    <Path d={`M0 ${TRACK_H - 185} C120 ${TRACK_H - 255}, 280 ${TRACK_H - 165}, 480 ${TRACK_H - 210} C640 ${TRACK_H - 250}, 820 ${TRACK_H - 170}, ${totalW} ${TRACK_H - 200} L${totalW} ${TRACK_H} L0 ${TRACK_H} Z`}
      fill="#c8884a" opacity={0.45} />
    <Path d={`M0 ${TRACK_H - 175} C160 ${TRACK_H - 240}, 340 ${TRACK_H - 155}, 560 ${TRACK_H - 200} C720 ${TRACK_H - 235}, 900 ${TRACK_H - 160}, ${totalW} ${TRACK_H - 190} L${totalW} ${TRACK_H} L0 ${TRACK_H} Z`}
      fill="#d69a45" opacity={0.55} />
    <Path d={`M0 ${TRACK_H - 148} C200 ${TRACK_H - 218}, 460 ${TRACK_H - 92}, ${totalW} ${TRACK_H - 162} L${totalW} ${TRACK_H} L0 ${TRACK_H} Z`}
      fill="#b7782c" opacity={0.82} />
    {/* Suelo verde */}
    <Rect x={0} y={TRACK_H - 120} width={totalW} height={120} fill="url(#groundG)" />
    <Rect x={0} y={TRACK_H - 70}  width={totalW} height={70}  fill="#5b9e54" opacity={0.90} />
    {/* Línea de horizonte acuarela */}
    <Path d={`M0 ${TRACK_H - 120} C140 ${TRACK_H - 136}, 310 ${TRACK_H - 118}, ${totalW} ${TRACK_H - 120}`}
      stroke="rgba(255,255,255,0.14)" strokeWidth={2} fill="none" />
    {/* Río acuarela — capas */}
    <Rect x={0} y={TRACK_H - 36} width={totalW} height={36} fill="url(#riverG)" opacity={0.60} />
    <Rect x={0} y={TRACK_H - 34} width={totalW} height={34} fill="rgba(120,190,240,0.25)" />
    <Path d={`M0 ${TRACK_H - 26} C180 ${TRACK_H - 40}, 420 ${TRACK_H - 12}, ${totalW} ${TRACK_H - 26}`}
      stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
    <Path d={`M0 ${TRACK_H - 14} C150 ${TRACK_H - 26}, 340 ${TRACK_H - 4}, ${totalW} ${TRACK_H - 14}`}
      stroke="rgba(255,255,255,0.16)" strokeWidth={2} fill="none" />
    {/* Reflejos del río */}
    {[0.08, 0.22, 0.38, 0.54, 0.70, 0.86].map((t, i) => (
      <Ellipse key={`ref-${i}`}
        cx={totalW * t} cy={TRACK_H - 20}
        rx={18 + (i % 3) * 6} ry={3}
        fill="rgba(255,255,255,0.18)"
      />
    ))}
  </React.Fragment>
);

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

const Visual1 = ({ totalW }) => (
  <Svg
    width={totalW}
    height={TRACK_H}
    style={[StyleSheet.absoluteFill, { zIndex: 1 }]}
    pointerEvents="none"
  >
    <CieloYSol       totalW={totalW} />
    <NubesAcuarela   totalW={totalW} />
    <PajarosYEstrellas totalW={totalW} />
    <Terreno         totalW={totalW} />
  </Svg>
);

export default Visual1;
