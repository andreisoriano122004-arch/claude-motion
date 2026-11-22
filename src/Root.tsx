import React from 'react';
import {Composition, Still} from 'remotion';
import {ArticleCover} from './ArticleCover';
import {EffortVideo} from './EffortVideo';
import {FPS, H, TL, W} from './lib';
import {FPS as REEL_FPS, REEL_H, REEL_W, Reel333} from './reel333/Reel333';
import {OCTO_FPS, OCTO_H, OCTO_W, OctoReel} from './octo/OctoReel';

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
    <Still id="ArticleCover" component={ArticleCover} width={2000} height={800} />
  </>
);
