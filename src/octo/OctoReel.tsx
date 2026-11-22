import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {clamp01, easeIn, easeInOut, easeOut, rand} from '../lib';
import cut from './cut.json';

// Octopus facts reel — the edit: every cut, camera move and effect comes from cut.json, written by
// /home/user/reels/octopus/cut.py from the recorded voiceover. Game-UI motion graphics, captions and
// sound are layered on top in OpenFilm.

export const OCTO_FPS = cut.fps;
export const OCTO_W = 1080;
export const OCTO_H = 1920;

type Cam = {z0?: number; z1?: number; fx?: number; fy?: number; ease?: string; shake?: number};
type Fx = {whip?: number; flash?: number; glitch?: number[][]; gray?: boolean; punch?: number[]; shakeAt?: number[]};
type Shot = {i: number; t0: number; t1: number; clip: string; name: string; src: number; rate: number; cam: Cam; fx: Fx};

const EASE: Record<string, (x: number) => number> = {out: easeOut, inout: easeInOut, in: easeIn, lin: (x) => x};
const WHIP = 0.22; // seconds of whip-pan smear at the head of a shot

/** Zoom punch: jumps in on the word, springs back over ~0.4 s. */
const punchAt = (frame: number, times: number[] = []) =>
  times.reduce((acc, t) => {
    const f = frame - t * OCTO_FPS;
    if (f < 0) return acc;
    const kick = spring({frame: f, fps: OCTO_FPS, config: {damping: 9, stiffness: 260, mass: 0.6}});
    return acc + 0.12 * (1 - kick) * Math.min(1, f / 2);
  }, 0);

const Clip: React.FC<{shot: Shot}> = ({shot}) => (
  <OffthreadVideo
    src={staticFile(`oct/${shot.clip}`)}
    trimBefore={Math.round(shot.src * OCTO_FPS)}
    playbackRate={shot.rate}
    muted
    style={{width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated'}}
  />
);

const Split: React.FC<{children: React.ReactNode; dx: number}> = ({children, dx}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {[
      ['r', -dx],
      ['g', 0],
      ['b', dx],
    ].map(([ch, off]) => (
      <AbsoluteFill key={ch as string} style={{transform: `translateX(${off}px)`, filter: `url(#oct-${ch})`, mixBlendMode: 'screen'}}>
        {children}
      </AbsoluteFill>
    ))}
  </AbsoluteFill>
);

const ShotView: React.FC<{shot: Shot}> = ({shot}) => {
  const f = useCurrentFrame();
  const t = f / OCTO_FPS;
  const dur = shot.t1 - shot.t0;
  const {cam, fx} = shot;
  const gf = shot.t0 * OCTO_FPS + f;
  const e = (EASE[cam.ease ?? 'out'] ?? easeOut)(clamp01(t / dur));
  let z = (cam.z0 ?? 1) + ((cam.z1 ?? 1) - (cam.z0 ?? 1)) * e + punchAt(gf, fx.punch);
  let amp = cam.shake ?? 0;
  if (fx.shakeAt) {
    const [a, len, px] = fx.shakeAt;
    if (t >= a && t < a + len) amp += px * (1 - (t - a) / len);
  }
  const sx = amp * (Math.sin(gf * 1.7) + 0.6 * Math.sin(gf * 3.9 + 1.3));
  const sy = amp * (Math.cos(gf * 1.3) + 0.5 * Math.sin(gf * 4.7 + 0.4));
  // whip-pan in: the shot slides in from the side with a smear of trailing copies, then settles
  const w = fx.whip && t < WHIP ? 1 - easeOut(t / WHIP) : 0;
  const wx = (fx.whip ?? 0) * w * OCTO_W * 0.55;
  z += 0.08 * w;
  const glitch = (fx.glitch ?? []).some(([a, b]) => t >= a && t < b);
  const flash = fx.flash ? Math.max(0, 1 - t / fx.flash) : 0;
  const layer = (dx: number, op: number, key: string) => (
    <AbsoluteFill
      key={key}
      style={{
        opacity: op,
        transform: `translate(${sx + dx}px, ${sy}px) scale(${z})`,
        transformOrigin: `${(cam.fx ?? 0.5) * 100}% ${(cam.fy ?? 0.5) * 100}%`,
        filter: fx.gray ? 'grayscale(1) contrast(1.15)' : undefined,
      }}
    >
      <Clip shot={shot} />
    </AbsoluteFill>
  );
  // whip pan: the shot moves as a continuous strip (a wrapped copy fills the side it uncovers), with a smear
  const wrap = -(fx.whip ?? 0) * OCTO_W * z;
  const moved =
    w > 0.02 ? (
      <AbsoluteFill>
        {[3, 2, 1].map((k) => layer(wx + (fx.whip ?? 0) * k * 70 * w, 0.28, `s${k}`))}
        {layer(wx, 1, 'main')}
        {layer(wx + wrap, 1, 'wrap')}
      </AbsoluteFill>
    ) : (
      layer(0, 1, 'main')
    );
  return (
    <AbsoluteFill style={{overflow: 'hidden', background: '#000'}}>
      {glitch ? <Split dx={12 + rand(gf) * 16}>{moved}</Split> : moved}
      {glitch
        ? [0, 1, 2].map((k) => {
            const y0 = rand(gf * 3 + k) * 85;
            const h = 3 + rand(gf * 7 + k) * 8;
            return (
              <AbsoluteFill
                key={k}
                style={{clipPath: `inset(${y0}% 0 ${100 - y0 - h}% 0)`, transform: `translateX(${(rand(gf * 11 + k) - 0.5) * 140}px)`}}
              >
                {moved}
              </AbsoluteFill>
            );
          })
        : null}
      {fx.gray ? (
        // "octopus vision": a lens vignette while the world goes grey
        <AbsoluteFill style={{background: 'radial-gradient(62% 40% at 50% 46%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)'}} />
      ) : null}
      {flash > 0 ? <AbsoluteFill style={{background: '#fff', opacity: flash}} /> : null}
    </AbsoluteFill>
  );
};

export const OctoReel: React.FC = () => {
  const frame = useCurrentFrame();
  const shots = cut.shots as Shot[];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id="oct-r">
          <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="oct-g">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
        </filter>
        <filter id="oct-b">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
        </filter>
      </svg>
      {shots.map((s) => (
        // start and end both rounded to frames, so consecutive shots butt exactly (no black gap frame)
        <Sequence key={s.i} from={Math.round(s.t0 * OCTO_FPS)} durationInFrames={Math.round(s.t1 * OCTO_FPS) - Math.round(s.t0 * OCTO_FPS)}>
          <ShotView shot={s} />
        </Sequence>
      ))}
      {/* console texture: faint interlace lines that roll slowly, soft vignette */}
      <AbsoluteFill
        style={{
          opacity: 0.09,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,1) 0px, rgba(0,0,0,1) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)',
          backgroundPositionY: `${(frame % 2) * 3}px`,
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(80% 62% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.45) 100%)'}} />
    </AbsoluteFill>
  );
};
