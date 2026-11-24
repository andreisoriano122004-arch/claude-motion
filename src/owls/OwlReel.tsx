import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {clamp01, easeInOut, easeOut} from '../lib';
import cut from './cut.json';

// Owl facts reel — the edit: every cut, camera drift and transition comes from cut.json, written by
// /home/user/reels/owls/cut.py from the recorded voiceover. Motion graphics, captions and sound are layered
// on top in OpenFilm.
//
// Style: simple, smooth, fast. No whip smear, flash, glitch or shake. Energy comes from short shots; the
// camera drifts on an ease-in-out curve, a word gets a small soft push-in (no springy bounce), and a shot
// arrives with a hard cut, a short crossfade or a short soft slide.

export const OWL_FPS = cut.fps;
export const OWL_W = 1080;
export const OWL_H = 1920;

type Cam = {z0?: number; z1?: number; fx?: number; fy?: number};
type Fx = {punch?: number[]; xfade?: number; slide?: number};
type Shot = {i: number; t0: number; t1: number; clip: string; name: string; src: number; rate: number; cam: Cam; fx: Fx};

const PUNCH = 0.04; // a small push-in on a key word
const SLIDE_F = 6; // frames a sliding shot takes to settle

/** Soft punch: eases in over 5 frames, eases back out over 14; never overshoots. */
const punchAt = (frame: number, times: number[] = []) =>
  times.reduce((acc, t) => {
    const f = frame - t * OWL_FPS;
    if (f < 0 || f > 19) return acc;
    const k = f < 5 ? easeOut(f / 5) : 1 - easeInOut((f - 5) / 14);
    return acc + PUNCH * k;
  }, 0);

const Clip: React.FC<{shot: Shot}> = ({shot}) => (
  <OffthreadVideo
    src={staticFile(`owls/${shot.clip}`)}
    trimBefore={Math.round(shot.src * OWL_FPS)}
    playbackRate={shot.rate}
    muted
    style={{width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated'}}
  />
);

const ShotView: React.FC<{shot: Shot}> = ({shot}) => {
  const f = useCurrentFrame();
  const t = f / OWL_FPS;
  const dur = shot.t1 - shot.t0;
  const {cam, fx} = shot;
  const gf = Math.round(shot.t0 * OWL_FPS) + f;
  const z = (cam.z0 ?? 1) + ((cam.z1 ?? 1) - (cam.z0 ?? 1)) * easeInOut(clamp01(t / dur)) + punchAt(gf, fx.punch);
  // arrival over the previous shot (which keeps playing underneath): crossfade, or a short soft slide
  let op = 1;
  let dx = 0;
  if (fx.xfade) op = easeInOut(clamp01((f + 1) / (fx.xfade + 1)));
  if (fx.slide) {
    const k = easeOut(clamp01((f + 1) / (SLIDE_F + 1)));
    dx = fx.slide * (1 - k) * OWL_W * 0.18;
    op = Math.min(op, clamp01(k * 1.6));
  }
  return (
    <AbsoluteFill style={{overflow: 'hidden', opacity: op}}>
      <AbsoluteFill
        style={{
          transform: `translateX(${dx}px) scale(${z})`,
          transformOrigin: `${(cam.fx ?? 0.5) * 100}% ${(cam.fy ?? 0.5) * 100}%`,
        }}
      >
        <Clip shot={shot} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const OwlReel: React.FC = () => {
  const shots = cut.shots as Shot[];
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {shots.map((s, i) => {
        // both ends rounded to frames so consecutive shots butt exactly (no black gap frame); a shot keeps
        // playing under the next one while that one fades or slides in (the renders carry a 0.3 s tail)
        const nx = shots[i + 1];
        const over = nx ? Math.max(nx.fx.xfade ?? 0, nx.fx.slide ? SLIDE_F : 0) : 0;
        const from = Math.round(s.t0 * OWL_FPS);
        return (
          <Sequence key={s.i} from={from} durationInFrames={Math.round(s.t1 * OWL_FPS) - from + over}>
            <ShotView shot={s} />
          </Sequence>
        );
      })}
      {/* console texture: faint static interlace lines and a soft vignette */}
      <AbsoluteFill
        style={{
          opacity: 0.06,
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,1) 0px, rgba(0,0,0,1) 3px, rgba(0,0,0,0) 3px, rgba(0,0,0,0) 6px)',
        }}
      />
      <AbsoluteFill style={{background: 'radial-gradient(80% 62% at 50% 50%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.4) 100%)'}} />
    </AbsoluteFill>
  );
};
