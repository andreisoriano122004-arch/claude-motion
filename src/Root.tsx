import React from 'react';
import {Composition, Still} from 'remotion';
import {ArticleCover} from './ArticleCover';
import {EffortVideo} from './EffortVideo';
import {FPS, H, TL, W} from './lib';
import {FPS as REEL_FPS, REEL_H, REEL_W, Reel333} from './reel333/Reel333';
import {OCTO_FPS, OCTO_H, OCTO_W, OctoReel} from './octo/OctoReel';
import {PYR_FPS, PYR_H, PYR_W, PyrReel} from './pyr/PyrReel';
import {MOON_FPS, MOON_H, MOON_W, MoonReel} from './moon/MoonReel';
import {BEE_FPS, BEE_H, BEE_W, BeeReel} from './bees/BeeReel';

export const Root: React.FC = () => (
  <>
    <Composition
      id="EffortVideo"
      component={EffortVideo}
      durationInFrames={Math.round(TL.duration * FPS)}
      fps={FPS}
      width={W}
      height={H}
    />
    <Composition
      id="Reel333"
      component={Reel333}
      durationInFrames={60 * REEL_FPS}
      fps={REEL_FPS}
      width={REEL_W}
      height={REEL_H}
    />
    <Composition
      id="OctoReel"
      component={OctoReel}
      durationInFrames={60 * OCTO_FPS}
      fps={OCTO_FPS}
      width={OCTO_W}
      height={OCTO_H}
    />
    <Composition
      id="PyrReel"
      component={PyrReel}
      durationInFrames={60 * PYR_FPS}
      fps={PYR_FPS}
      width={PYR_W}
      height={PYR_H}
    />
    <Composition
      id="MoonReel"
      component={MoonReel}
      durationInFrames={60 * MOON_FPS}
      fps={MOON_FPS}
      width={MOON_W}
      height={MOON_H}
    />
    <Composition
      id="BeeReel"
      component={BeeReel}
      durationInFrames={60 * BEE_FPS}
      fps={BEE_FPS}
      width={BEE_W}
      height={BEE_H}
    />
    <Still id="ArticleCover" component={ArticleCover} width={2000} height={800} />
  </>
);
