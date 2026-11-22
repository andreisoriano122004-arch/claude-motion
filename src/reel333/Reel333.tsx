import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Grain} from '../components/primitives';
import {clamp01, easeIn, easeInOut, easeOut, rand} from '../lib';
import cut from './cut.json';

// 3:33 — the footage track: every cut, camera move and effect is read from cut.json
// (written by /home/user/reels/333/cut.py from the recorded VO). Motion graphics, captions and
// sound are added on top in OpenFilm.

export const FPS = cut.fps;
export const REEL_W = 1080;
export const REEL_H = 1920;

type Cam = {z0?: number; z1?: number; fx?: number; fy?: number; ease?: string; shake?: number};
type Fx = {
  flashIn?: number;
  flashAt?: number[];
  shakeAt?: number[];
  glitch?: number[][];
  ui?: string;
  dim?: number;
  pulse?: number;
  glow?: number;
};
type Src = {img?: string; video?: string; from?: number; black?: boolean; pending?: boolean};
type Shot = {i: number; t0: number; t1: number; src: Src; cam: Cam; fx: Fx};

const EASE: Record<string, (x: number) => number> = {
  out: easeOut,
  inout: easeInOut,
  in: easeIn,
  lin: (x) => x,
};
const RED = '#ff2a2a';
const asset = (p: string) => staticFile(`333/${p}`);
const inGlitch = (t: number, g?: number[][]) => (g ?? []).some(([a, b]) => t >= a && t < b);

/** Red vignette that thumps with every heartbeat of the 3:31 -> 3:33 count. */
const heartAt = (t: number) =>
  cut.beats.heart.reduce((acc, b) => {
    const d = t - b;
    if (d < 0) return acc;
    return Math.max(acc, Math.exp(-d / 0.09) + 0.6 * Math.exp(-Math.max(0, d - 0.17) / 0.09) * (d > 0.17 ? 1 : 0));
  }, 0);

const Media: React.FC<{src: Src; shotFrames: number}> = ({src}) => {
  const fill: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};
  if (src.video) {
    return (
      <OffthreadVideo
        src={asset(src.video)}
        trimBefore={Math.round((src.from ?? 0) * FPS)}
        muted
        style={fill}
      />
    );
  }
  if (src.img) return <Img src={asset(src.img)} style={fill} />;
  return <AbsoluteFill style={{background: '#000'}} />;
};

/** The shot drawn three times, one colour channel each, pulled apart: the RGB split of a glitch frame. */
const Split: React.FC<{children: React.ReactNode; dx: number}> = ({children, dx}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {[
      ['r', -dx],
      ['g', 0],
      ['b', dx],
    ].map(([ch, off]) => (
      <AbsoluteFill
        key={ch as string}
        style={{transform: `translateX(${off}px)`, filter: `url(#only-${ch})`, mixBlendMode: 'screen'}}
      >
        {children}
      </AbsoluteFill>
    ))}
  </AbsoluteFill>
);

const ShotView: React.FC<{shot: Shot}> = ({shot}) => {
  const f = useCurrentFrame(); // local to the Sequence
  const t = f / FPS;
  const dur = shot.t1 - shot.t0;
  const {cam, fx, src} = shot;
  const e = (EASE[cam.ease ?? 'out'] ?? easeOut)(clamp01(t / dur));
  const z = (cam.z0 ?? 1) + ((cam.z1 ?? 1) - (cam.z0 ?? 1)) * e;
  let amp = cam.shake ?? 0;
  if (fx.shakeAt) {
    const [a, len, px] = fx.shakeAt;
    if (t >= a && t < a + len) amp += px * (1 - (t - a) / len);
  }
  const gf = shot.t0 * FPS + f; // global frame keeps the shake continuous across cuts of one move
  const sx = amp * (Math.sin(gf * 1.7) + 0.6 * Math.sin(gf * 3.9 + 1.3));
  const sy = amp * (Math.cos(gf * 1.3) + 0.5 * Math.sin(gf * 4.7 + 0.4));
  const glitch = inGlitch(t, fx.glitch);
  const flashIn = fx.flashIn ? Math.max(0, 1 - t / fx.flashIn) * 0.95 : 0;
  const flashAt = fx.flashAt && t >= fx.flashAt[0] ? Math.max(0, 1 - (t - fx.flashAt[0]) / fx.flashAt[1]) : 0;
  const white = Math.max(flashIn, flashAt);
  const media = <Media src={src} shotFrames={Math.round(dur * FPS)} />;
  const moved = (
    <AbsoluteFill
      style={{
        transform: `translate(${sx}px, ${sy}px) scale(${z})`,
        transformOrigin: `${(cam.fx ?? 0.5) * 100}% ${(cam.fy ?? 0.5) * 100}%`,
      }}
    >
      {media}
    </AbsoluteFill>
  );
  const slices = glitch
    ? [0, 1, 2].map((k) => {
        const y0 = rand(gf * 3 + k) * 82;
        const h = 3 + rand(gf * 7 + k) * 9;
        const dx = (rand(gf * 11 + k) - 0.5) * 120;
        return (
          <AbsoluteFill
            key={k}
            style={{clipPath: `inset(${y0}% 0 ${100 - y0 - h}% 0)`, transform: `translateX(${dx}px)`}}
          >
            {moved}
          </AbsoluteFill>
        );
      })
    : null;
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      {glitch ? <Split dx={14 + rand(gf) * 18}>{moved}</Split> : moved}
      {slices}
      {fx.ui ? <Img src={asset(fx.ui)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} /> : null}
      {fx.glow ? (
        <AbsoluteFill
          style={{
            mixBlendMode: 'screen',
            opacity: fx.glow * (0.75 + 0.25 * Math.sin(gf * 0.9)),
            background:
              'radial-gradient(120% 9% at 50% 30%, rgba(235,245,255,0.95), rgba(160,200,255,0.35) 45%, rgba(0,0,0,0) 75%)',
          }}
        />
      ) : null}
      {fx.dim ? <AbsoluteFill style={{background: '#000', opacity: fx.dim}} /> : null}
      {white > 0 ? <AbsoluteFill style={{background: '#fff', opacity: white}} /> : null}
    </AbsoluteFill>
  );
};

export const Reel333: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const shots = cut.shots as Shot[];
  const cur = shots.find((s) => t >= s.t0 && t < s.t1);
  const pulse = cur?.fx.pulse ?? 0;
  const beat = pulse * heartAt(t);
  const flicker = 0.035 * (rand(Math.floor(frame / 2)) - 0.5) + (rand(frame * 0.37) > 0.985 ? 0.08 : 0);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="only-r">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="only-g">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="only-b">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      {shots.map((s) => (
        <Sequence key={s.i} from={Math.round(s.t0 * FPS)} durationInFrames={Math.round(s.t1 * FPS) - Math.round(s.t0 * FPS)}>
          <ShotView shot={s} />
        </Sequence>
      ))}
      {/* texture: vignette, heartbeat red, scanlines, flicker, grain */}
      <AbsoluteFill
        style={{background: 'radial-gradient(75% 60% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.62) 100%)'}}
      />
      {beat > 0.01 ? (
        <AbsoluteFill
          style={{
            opacity: Math.min(1, beat),
            background: `radial-gradient(70% 55% at 50% 50%, rgba(0,0,0,0) 45%, ${RED}aa 100%)`,
            mixBlendMode: 'multiply',
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          opacity: 0.07,
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.9) 0px, rgba(0,0,0,0.9) 2px, rgba(0,0,0,0) 2px, rgba(0,0,0,0) 5px)',
        }}
      />
      <AbsoluteFill style={{background: flicker > 0 ? '#fff' : '#000', opacity: Math.abs(flicker)}} />
      <Grain frame={frame} opacity={0.14} />
    </AbsoluteFill>
  );
};
