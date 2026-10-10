/**
 * fullscreen.ts
 * Shared Fullscreen API Controller for NM Mock Interview Sandbox.
 * Enforces unified browser fullscreen across Aptitude, Coding, and HR rounds.
 */

export const isBrowserFullscreen = (): boolean => {
  if (typeof document === 'undefined') return false;
  return Boolean(
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement
  );
};

export const requestAssessmentFullscreen = async (): Promise<boolean> => {
  if (typeof document === 'undefined') return false;
  try {
    if (isBrowserFullscreen()) return true;
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
      return true;
    } else if ((elem as any).webkitRequestFullscreen) {
      await (elem as any).webkitRequestFullscreen();
      return true;
    } else if ((elem as any).mozRequestFullScreen) {
      await (elem as any).mozRequestFullScreen();
      return true;
    } else if ((elem as any).msRequestFullscreen) {
      await (elem as any).msRequestFullscreen();
      return true;
    }
  } catch (err) {
    console.warn('[Fullscreen] Request failed or was blocked by browser:', err);
    return false;
  }
  return false;
};

export const exitAssessmentFullscreen = async (): Promise<void> => {
  if (typeof document === 'undefined') return;
  try {
    if (isBrowserFullscreen()) {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    }
  } catch (err) {
    console.warn('[Fullscreen] Exit failed:', err);
  }
};
