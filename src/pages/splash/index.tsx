import { buttonVariants } from "@/components/ui/button.tsx";
import { useCallback, useEffect, useRef, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import classes from './home.module.css';
import { setupAnimation, type AnimationControls } from './animation';

const splashStyle = { borderRadius: "0", textDecoration: "none" };

export default function Splash() {
  const navigate = useNavigate();
  const animationControls = useRef<AnimationControls | null>(null);
  const isHoveringButton = useRef(false);
  const isPressingButton = useRef(false);
  const pendingReleaseTimer = useRef<number | null>(null);
  const clickNavigatePending = useRef(false);

  useEffect(() => {
    animationControls.current = setupAnimation();
    return () => {
      if (pendingReleaseTimer.current !== null) {
        window.clearTimeout(pendingReleaseTimer.current);
        pendingReleaseTimer.current = null;
      }
      animationControls.current?.cleanup();
    };
  }, []);

  const syncWarpState = useCallback(() => {
    if (pendingReleaseTimer.current !== null) {
      window.clearTimeout(pendingReleaseTimer.current);
      pendingReleaseTimer.current = null;
    }

    if (isHoveringButton.current || isPressingButton.current) {
      animationControls.current?.triggerWarp();
      return;
    }
    pendingReleaseTimer.current = window.setTimeout(() => {
      const playEndEffect = !clickNavigatePending.current;
      animationControls.current?.stopWarp(playEndEffect);
      clickNavigatePending.current = false;
      pendingReleaseTimer.current = null;
    }, 120);
  }, []);

  const handlePointerEnter = useCallback(() => {
    isHoveringButton.current = true;
    syncWarpState();
  }, [syncWarpState]);

  const handlePointerLeave = useCallback(() => {
    isHoveringButton.current = false;
    syncWarpState();
  }, [syncWarpState]);

  const handlePointerDown = useCallback(() => {
    isPressingButton.current = true;
    syncWarpState();
  }, [syncWarpState]);

  const handlePointerUp = useCallback(() => {
    isPressingButton.current = false;
    syncWarpState();
  }, [syncWarpState]);

  const handlePointerCancel = useCallback(() => {
    isPressingButton.current = false;
    syncWarpState();
  }, [syncWarpState]);

  const handleStart = useCallback((e: MouseEvent) => {
    e.preventDefault();
    clickNavigatePending.current = true;
    if (pendingReleaseTimer.current !== null) {
      window.clearTimeout(pendingReleaseTimer.current);
      pendingReleaseTimer.current = null;
    }
    animationControls.current?.stopWarp(false);
    navigate(`${process.env.BASE_PATH || ''}home`);
  }, [navigate]);

  return (
    <div className={classes.mycontainer}>
      <canvas id="starcanvas" className={classes.mycanvas}></canvas>
      <canvas id="horrorcanvas" className={classes.mycanvas} style={{ zIndex: 0 }}></canvas>
      <div className={classes.hero}>
        <div className={classes.overlay}></div>
      </div>
      <div className="flex flex-col relative z-10">
        <div className={classes.typedContainer}>
          <div className={classes.typed}>
            LOCUTUS
          </div>
        </div>
        <a
          href={`${process.env.BASE_PATH || ''}home`}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={handleStart}
          style={splashStyle}
          className={`${buttonVariants({ variant: "default" })} rounded-none opacity-25 border-white no-underline border-4 ${classes.mybutton}`}
        >
          &gt; INITIALIZE
        </a>
      </div>
    </div>
  );
}