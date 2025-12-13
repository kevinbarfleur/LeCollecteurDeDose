import { ref, type Ref } from 'vue';
import html2canvas from 'html2canvas';
import gsap from 'gsap';
import { DISINTEGRATION } from '~/constants/timing';

/**
 * Options for the disintegration effect
 */
export interface DisintegrationOptions {
  /** Number of frames to split the image into */
  frameCount?: number;
  /** Direction of particle movement: 'up' or 'out' (radial) */
  direction?: 'up' | 'out';
  /** Duration of each frame's animation in seconds */
  duration?: number;
  /** Multiplier for staggered delay between frames */
  delayMultiplier?: number;
  /** Target display width (uses canvas width if not specified) */
  targetWidth?: number;
  /** Target display height (uses canvas height if not specified) */
  targetHeight?: number;
}

/**
 * Captured dimensions of a snapshot
 */
export interface CapturedDimensions {
  width: number;
  height: number;
}

/**
 * Composable for creating card disintegration effects
 * Used for dramatic card destruction animations
 */
export function useDisintegrationEffect() {
  // Get disintegrate from window (initialized by plugin)
  const getDisintegrate = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).disintegrate || null;
  };
  
  // Ensure disintegrate is initialized
  const ensureDisintegrateInitialized = () => {
    const disintegrate = getDisintegrate();
    if (disintegrate && disintegrate.init && typeof disintegrate.init === 'function') {
      try {
        disintegrate.init();
      } catch (e) {
        console.warn('[DisintegrationEffect] Failed to initialize disintegrate:', e);
      }
    }
    return disintegrate;
  };

  // Snapshot state
  const cardSnapshot = ref<HTMLCanvasElement | null>(null);
  const imageSnapshot = ref<HTMLCanvasElement | null>(null);
  const isCapturingSnapshot = ref(false);
  const capturedImageDimensions = ref<CapturedDimensions | null>(null);
  const capturedCardDimensions = ref<CapturedDimensions | null>(null);

  /**
   * Load an image URL into a canvas element
   */
  const loadImageToCanvas = (
    imgUrl: string,
    targetWidth?: number,
    targetHeight?: number
  ): Promise<HTMLCanvasElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const width = targetWidth || img.naturalWidth;
        const height = targetHeight || img.naturalHeight;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas);
        } else {
          resolve(null);
        }
      };

      img.onerror = () => resolve(null);
      img.src = `/api/image-proxy?url=${encodeURIComponent(imgUrl)}`;
    });
  };

  /**
   * Check if a canvas has any non-transparent content
   */
  const canvasHasContent = (canvas: HTMLCanvasElement): boolean => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    // Check alpha channel of each pixel
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) return true;
    }
    return false;
  };

  /**
   * Generate disintegration frames by distributing pixels across multiple canvases
   */
  const generateDisintegrationFrames = (
    canvas: HTMLCanvasElement,
    count: number
  ): HTMLCanvasElement[] => {
    const { width, height } = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const originalData = ctx.getImageData(0, 0, width, height);
    const imageDatas = [...Array(count)].map(() => ctx.createImageData(width, height));

    // Distribute pixels across frames based on position (left to right bias)
    for (let x = 0; x < width; ++x) {
      for (let y = 0; y < height; ++y) {
        for (let i = 0; i < DISINTEGRATION.REPETITION_COUNT; ++i) {
          // Frame index is weighted by x position for left-to-right disintegration
          const dataIndex = Math.floor(
            (count * (Math.random() + (2 * x) / width)) / 3
          );
          const pixelIndex = (y * width + x) * 4;
          // Copy RGBA values
          for (let offset = 0; offset < 4; ++offset) {
            imageDatas[dataIndex].data[pixelIndex + offset] =
              originalData.data[pixelIndex + offset];
          }
        }
      }
    }

    // Convert ImageData to canvas elements
    return imageDatas.map((data) => {
      const newCanvas = document.createElement('canvas');
      newCanvas.width = width;
      newCanvas.height = height;
      newCanvas.getContext('2d')?.putImageData(data, 0, 0);
      return newCanvas;
    });
  };


  /**
   * Create and animate the disintegration effect
   * @returns Promise that resolves with the created frame canvases
   */
  const createDisintegrationEffect = (
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    options: DisintegrationOptions = {}
  ): Promise<HTMLCanvasElement[]> => {
    const {
      frameCount = DISINTEGRATION.FRAMES,
      direction = 'out',
      duration = 1.2,
      delayMultiplier = 1.5,
      targetWidth,
      targetHeight,
    } = options;

    const displayWidth = targetWidth || canvas.width;
    const displayHeight = targetHeight || canvas.height;
    const frames = generateDisintegrationFrames(canvas, frameCount);

    // Position frames in the container
    frames.forEach((frame) => {
      frame.style.cssText = `
        position: absolute;
        left: 0;
        top: 0;
        width: ${displayWidth}px;
        height: ${displayHeight}px;
        opacity: 1;
        transform: rotate(0deg) translate(0px, 0px);
      `;
      container.appendChild(frame);
    });

    return new Promise((resolve) => {
      // Use nested rAF for proper CSS transition batching
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Apply transitions
          frames.forEach((frame, i) => {
            frame.style.transition = `transform ${duration}s ease-out, opacity ${duration}s ease-out`;
            frame.style.transitionDelay = `${(delayMultiplier * i) / frames.length}s`;
          });

          requestAnimationFrame(() => {
            // Apply final transforms
            frames.forEach((frame) => {
              const randomAngle = 2 * Math.PI * (Math.random() - 0.5);
              let translateX: number, translateY: number;

              if (direction === 'up') {
                // Particles float upward with slight horizontal variance
                translateX = (Math.random() - 0.5) * 120;
                translateY = -100 - Math.random() * 150;
              } else {
                // Particles explode radially outward
                const distance = 80 + Math.random() * 60;
                translateX = distance * Math.cos(randomAngle);
                translateY = distance * Math.sin(randomAngle) - 30;
              }

              frame.style.transform = `
                rotate(${25 * (Math.random() - 0.5)}deg) 
                translate(${translateX}px, ${translateY}px)
                rotate(${20 * (Math.random() - 0.5)}deg)
              `;
              frame.style.opacity = '0';
            });

            resolve(frames);
          });
        });
      });
    });
  };

  /**
   * Find the card image wrapper element within a card front ref
   */
  const findCardImageElement = (cardFrontRef: Ref<HTMLElement | null>): HTMLElement | null => {
    if (!cardFrontRef.value) return null;
    return cardFrontRef.value.querySelector('.game-card__image-wrapper') as HTMLElement | null;
  };

  /**
   * Capture snapshots of both the card image and the full card for disintegration
   * @param cardFrontRef - Reference to the card front element
   * @param snapshotDelay - Delay before capturing (allows images to load)
   */
  const captureCardSnapshot = async (
    cardFrontRef: Ref<HTMLElement | null>,
    snapshotDelay: number = 800
  ): Promise<void> => {
    if (!cardFrontRef.value || isCapturingSnapshot.value) return;

    isCapturingSnapshot.value = true;

    try {
      // Wait for images to fully load and render
      await new Promise((resolve) => setTimeout(resolve, snapshotDelay));
      if (!cardFrontRef.value) {
        isCapturingSnapshot.value = false;
        return;
      }

      // Capture the card image
      const imgElement = cardFrontRef.value.querySelector('.game-card__image') as HTMLImageElement;
      const imageWrapperElement = findCardImageElement(cardFrontRef);

      if (imgElement && imgElement.src && imageWrapperElement) {
        const wrapperRect = imageWrapperElement.getBoundingClientRect();
        const naturalRatio = imgElement.naturalWidth / imgElement.naturalHeight;
        const wrapperRatio = wrapperRect.width / wrapperRect.height;

        const displaySize =
          naturalRatio > wrapperRatio
            ? wrapperRect.width
            : wrapperRect.height * naturalRatio;

        const targetSize = Math.round(displaySize);
        const directCanvas = await loadImageToCanvas(imgElement.src, targetSize, targetSize);

        if (directCanvas && canvasHasContent(directCanvas)) {
          imageSnapshot.value = directCanvas;
          capturedImageDimensions.value = {
            width: targetSize,
            height: targetSize,
          };
        }
      }

      // Capture the full card
      const cardRect = cardFrontRef.value.getBoundingClientRect();
      
      // Verify element has valid dimensions
      if (cardRect.width === 0 || cardRect.height === 0) {
        console.warn('[DisintegrationEffect] Card element has invalid dimensions, skipping capture');
        cardSnapshot.value = null;
        isCapturingSnapshot.value = false;
        return;
      }

      // Wait a bit more to ensure all images are loaded
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Verify element still exists and has dimensions
      if (!cardFrontRef.value) {
        isCapturingSnapshot.value = false;
        return;
      }

      const finalRect = cardFrontRef.value.getBoundingClientRect();
      if (finalRect.width === 0 || finalRect.height === 0) {
        console.warn('[DisintegrationEffect] Card element lost dimensions, skipping capture');
        cardSnapshot.value = null;
        isCapturingSnapshot.value = false;
        return;
      }

      const originalSrcs: Map<HTMLImageElement, string> = new Map();
      if (cardFrontRef.value) {
        const images = cardFrontRef.value.querySelectorAll('img');
        
        images.forEach((img) => {
          const htmlImg = img as HTMLImageElement;
          const currentSrc = htmlImg.getAttribute('src') || htmlImg.src;
          
          if (currentSrc && 
              !currentSrc.startsWith('/api/image-proxy') && 
              !currentSrc.startsWith('data:') &&
              !currentSrc.startsWith('blob:')) {
            try {
              const url = new URL(currentSrc, window.location.href);
              if (url.origin !== window.location.origin) {
                originalSrcs.set(htmlImg, currentSrc);
                const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(currentSrc)}`;
                htmlImg.crossOrigin = 'anonymous';
                htmlImg.setAttribute('src', proxyUrl);
                htmlImg.src = proxyUrl;
              }
            } catch (e) {
              // Invalid URL, skip
            }
          }
        });
        
        if (images.length > 0) {
          await Promise.all(Array.from(images).map((img) => {
            return new Promise<void>((resolve) => {
              const htmlImg = img as HTMLImageElement;
              if (htmlImg.complete && htmlImg.naturalWidth > 0) {
                resolve();
                return;
              }
              htmlImg.onload = () => resolve();
              htmlImg.onerror = () => resolve();
              setTimeout(() => resolve(), 3000);
            });
          }));
        }
      }

      // Now capture with html2canvas - images are already proxied and loaded
      const canvas = await html2canvas(cardFrontRef.value, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        foreignObjectRendering: false,
        onclone: (clonedDoc, element) => {
          try {
            const clonedElement = element || clonedDoc.body;
            const images = clonedElement.querySelectorAll('img');
            
            images.forEach((img) => {
              const htmlImg = img as HTMLImageElement;
              htmlImg.crossOrigin = 'anonymous';
              if (htmlImg.naturalWidth === 0 || htmlImg.naturalHeight === 0) {
                htmlImg.style.display = 'none';
                htmlImg.src = '';
              }
            });
            
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const computedStyle = window.getComputedStyle(htmlEl);
              const bgImage = computedStyle.backgroundImage;
              
              if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
                const bgImageMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (bgImageMatch && bgImageMatch[1]) {
                  const bgUrl = bgImageMatch[1];
                  
                  if (bgUrl.startsWith('data:')) {
                    const width = parseInt(computedStyle.width) || 0;
                    const height = parseInt(computedStyle.height) || 0;
                    if (width === 0 || height === 0) {
                      htmlEl.style.backgroundImage = 'none';
                    }
                  } else if (!bgUrl.includes('/api/image-proxy') && !bgUrl.startsWith('blob:')) {
                    try {
                      const url = new URL(bgUrl, window.location.href);
                      if (url.origin !== window.location.origin) {
                        htmlEl.style.backgroundImage = `url(/api/image-proxy?url=${encodeURIComponent(bgUrl)})`;
                      }
                    } catch (e) {
                      htmlEl.style.backgroundImage = 'none';
                    }
                  }
                }
              }
              
              const width = parseInt(computedStyle.width) || 0;
              const height = parseInt(computedStyle.height) || 0;
              if ((width === 0 || height === 0) && computedStyle.backgroundImage !== 'none') {
                htmlEl.style.backgroundImage = 'none';
              }
            });
          } catch (e) {
            console.error('[DisintegrationEffect] Error in onclone:', e);
          }
        },
        ignoreElements: (element) => {
          if (element instanceof HTMLImageElement) {
            if (element.naturalWidth === 0 || element.naturalHeight === 0) {
              return true;
            }
          }
          
          if (element instanceof HTMLElement) {
            const computedStyle = window.getComputedStyle(element);
            const bgImage = computedStyle.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
              const width = parseInt(computedStyle.width) || 0;
              const height = parseInt(computedStyle.height) || 0;
              if (width === 0 || height === 0) {
                return true;
              }
            }
          }
          
          return false;
        },
      });

      // Restore original srcs after capture
      originalSrcs.forEach((originalSrc, img) => {
        img.setAttribute('src', originalSrc);
        img.src = originalSrc;
        img.removeAttribute('crossorigin');
      });
      originalSrcs.clear();

      // Verify canvas has valid dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn('[DisintegrationEffect] Captured canvas has invalid dimensions');
        cardSnapshot.value = null;
      } else {
        cardSnapshot.value = canvas;
        capturedCardDimensions.value = {
          width: finalRect.width,
          height: finalRect.height,
        };
      }
    } catch (error) {
      console.error('[DisintegrationEffect] Failed to capture card snapshot:', error);
      cardSnapshot.value = null;
    }

    isCapturingSnapshot.value = false;
  };

  /**
   * Reset all snapshot state
   */
  const clearSnapshots = () => {
    cardSnapshot.value = null;
    imageSnapshot.value = null;
    capturedImageDimensions.value = null;
    capturedCardDimensions.value = null;
  };

  return {
    // State
    cardSnapshot,
    imageSnapshot,
    isCapturingSnapshot,
    capturedImageDimensions,
    capturedCardDimensions,
    
    // Methods
    loadImageToCanvas,
    canvasHasContent,
    generateDisintegrationFrames,
    createDisintegrationEffect,
    findCardImageElement,
    captureCardSnapshot,
    clearSnapshots,
  };
}

