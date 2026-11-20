import { useEffect, useRef } from 'react';
import { supportsMotion } from '../motion/environment';
import { mountScene } from '../motion/scene/scene';
import { connectScene, markSceneSettled } from '../motion/sceneSignals';

/** The decorative landscape behind the page. It is hidden from assistive technology and carries no data. */
export function Scene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !supportsMotion()) {
      markSceneSettled();
      return;
    }
    let unmount: () => void = () => undefined;
    // Creating a WebGL context can hold the page up for a moment, the first time a browser
    // does it most of all. Two frames on, the page's first picture has reached the screen.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        frame = 0;
        const scene = mountScene(canvas, markSceneSettled);
        if (!scene) return;
        const disconnect = connectScene(scene);
        unmount = () => {
          disconnect();
          scene.destroy();
        };
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      unmount();
    };
  }, []);

  return <canvas ref={canvasRef} className="scene" aria-hidden="true" />;
}
