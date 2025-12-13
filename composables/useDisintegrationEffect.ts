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
   * Create disintegration effect using the disintegrate.js library
   * This library uses html2canvas to create fine canvas particles
   * Optimized for performance with fine ash-like particles
   */
  const createDisintegrationEffectDOM = (
    sourceElement: HTMLElement,
    container: HTMLElement,
    options: DisintegrationOptions = {}
  ): Promise<HTMLElement[]> => {
    const {
      frameCount = 111, // Fine particles (reduction factor - lower = more particles)
      direction = 'out',
      duration = 1.1,
      delayMultiplier = 0.8,
      targetWidth,
      targetHeight,
    } = options;

    return new Promise((resolve) => {
      try {
        // Ensure disintegrate is initialized and available
        const disintegrate = ensureDisintegrateInitialized();
        
        // Check if disintegrate is available
        if (!disintegrate || !disintegrate.getDisObj || !disintegrate.createSimultaneousParticles) {
          console.warn('[DisintegrationEffect] disintegrate library not available or incomplete', {
            hasDisintegrate: !!disintegrate,
            hasGetDisObj: !!(disintegrate && disintegrate.getDisObj),
            hasCreateSimultaneousParticles: !!(disintegrate && disintegrate.createSimultaneousParticles)
          });
          resolve([]);
          return;
        }

        // Ensure element is in DOM and visible
        if (!sourceElement.parentNode || !document.body.contains(sourceElement)) {
          console.warn('[DisintegrationEffect] Source element is not in DOM');
          resolve([]);
          return;
        }

        // Set up the source element with disintegrate attributes
        // We'll add them temporarily to the original element
        const originalDisType = sourceElement.getAttribute('data-dis-type');
        const originalParticleType = sourceElement.getAttribute('data-dis-particle-type');
        const originalReductionFactor = sourceElement.getAttribute('data-dis-reduction-factor');

        sourceElement.setAttribute('data-dis-type', 'simultaneous');
        sourceElement.setAttribute('data-dis-particle-type', 'WindParticle'); // Custom wind particle type
        sourceElement.setAttribute('data-dis-reduction-factor', frameCount.toString());
        // Explicitly don't set data-dis-color to keep original card colors
        // Remove any existing color override
        sourceElement.removeAttribute('data-dis-color');

        // Re-initialize disintegrate to process this new element
        disintegrate.init();

        // Wait for the screenshot to be loaded (particlesReady event)
        const particlesReadyHandler = () => {
          try {
            // Get disintegrate object
            const disObj = disintegrate.getDisObj(sourceElement);
            
            if (!disObj) {
              console.warn('[DisintegrationEffect] Failed to get disintegrate object after init', {
                element: sourceElement,
                hasAttributes: {
                  disType: sourceElement.getAttribute('data-dis-type'),
                  particleType: sourceElement.getAttribute('data-dis-particle-type'),
                  reductionFactor: sourceElement.getAttribute('data-dis-reduction-factor')
                },
                inDOM: document.body.contains(sourceElement),
                visible: sourceElement.offsetWidth > 0 && sourceElement.offsetHeight > 0,
                disesLength: disintegrate.dises ? disintegrate.dises.length : 0
              });
              // Restore original attributes
              if (originalDisType) sourceElement.setAttribute('data-dis-type', originalDisType);
              else sourceElement.removeAttribute('data-dis-type');
              if (originalParticleType) sourceElement.setAttribute('data-dis-particle-type', originalParticleType);
              else sourceElement.removeAttribute('data-dis-particle-type');
              if (originalReductionFactor) sourceElement.setAttribute('data-dis-reduction-factor', originalReductionFactor);
              else sourceElement.removeAttribute('data-dis-reduction-factor');
              window.removeEventListener('particlesReady', particlesReadyHandler);
              resolve([]);
              return;
            }

            // Create particles
            disintegrate.createSimultaneousParticles(disObj);

            // Wait for animation to complete
            const animationDuration = duration * 1000;
            setTimeout(() => {
              // Clean up
              try {
                // Remove canvas if it exists
                if (disObj.canvas && disObj.canvas.parentNode) {
                  disObj.canvas.parentNode.removeChild(disObj.canvas);
                }
                // Remove from dises array
                const index = disintegrate.dises.indexOf(disObj);
                if (index > -1) {
                  disintegrate.dises.splice(index, 1);
                }
              } catch (e) {
                console.warn('[DisintegrationEffect] Error cleaning up disintegrate object:', e);
              }
              
              // Restore original attributes
              if (originalDisType) sourceElement.setAttribute('data-dis-type', originalDisType);
              else sourceElement.removeAttribute('data-dis-type');
              if (originalParticleType) sourceElement.setAttribute('data-dis-particle-type', originalParticleType);
              else sourceElement.removeAttribute('data-dis-particle-type');
              if (originalReductionFactor) sourceElement.setAttribute('data-dis-reduction-factor', originalReductionFactor);
              else sourceElement.removeAttribute('data-dis-reduction-factor');
              
              window.removeEventListener('particlesReady', particlesReadyHandler);
              resolve([]);
            }, animationDuration);
          } catch (error) {
            console.error('[DisintegrationEffect] Error in disintegrate animation:', error);
            // Restore original attributes
            if (originalDisType) sourceElement.setAttribute('data-dis-type', originalDisType);
            else sourceElement.removeAttribute('data-dis-type');
            if (originalParticleType) sourceElement.setAttribute('data-dis-particle-type', originalParticleType);
            else sourceElement.removeAttribute('data-dis-particle-type');
            if (originalReductionFactor) sourceElement.setAttribute('data-dis-reduction-factor', originalReductionFactor);
            else sourceElement.removeAttribute('data-dis-reduction-factor');
            window.removeEventListener('particlesReady', particlesReadyHandler);
            resolve([]);
          }
        };

        // Listen for particlesReady event
        window.addEventListener('particlesReady', particlesReadyHandler);
        
        // Fallback timeout in case particlesReady never fires
        setTimeout(() => {
          window.removeEventListener('particlesReady', particlesReadyHandler);
          // Try to get disObj anyway
          const disObj = disintegrate.getDisObj(sourceElement);
          if (disObj && disObj.scrnCanvas) {
            // Screenshot is ready, create particles
            try {
              disintegrate.createSimultaneousParticles(disObj);
              setTimeout(() => {
                // Clean up
                if (disObj.canvas && disObj.canvas.parentNode) {
                  disObj.canvas.parentNode.removeChild(disObj.canvas);
                }
                const index = disintegrate.dises.indexOf(disObj);
                if (index > -1) {
                  disintegrate.dises.splice(index, 1);
                }
                // Restore attributes
                if (originalDisType) sourceElement.setAttribute('data-dis-type', originalDisType);
                else sourceElement.removeAttribute('data-dis-type');
                if (originalParticleType) sourceElement.setAttribute('data-dis-particle-type', originalParticleType);
                else sourceElement.removeAttribute('data-dis-particle-type');
                if (originalReductionFactor) sourceElement.setAttribute('data-dis-reduction-factor', originalReductionFactor);
                else sourceElement.removeAttribute('data-dis-reduction-factor');
                resolve([]);
              }, duration * 1000);
            } catch (e) {
              console.error('[DisintegrationEffect] Error creating particles:', e);
              resolve([]);
            }
          } else {
            console.warn('[DisintegrationEffect] Screenshot not ready after timeout');
            // Restore attributes
            if (originalDisType) sourceElement.setAttribute('data-dis-type', originalDisType);
            else sourceElement.removeAttribute('data-dis-type');
            if (originalParticleType) sourceElement.setAttribute('data-dis-particle-type', originalParticleType);
            else sourceElement.removeAttribute('data-dis-particle-type');
            if (originalReductionFactor) sourceElement.setAttribute('data-dis-reduction-factor', originalReductionFactor);
            else sourceElement.removeAttribute('data-dis-reduction-factor');
            resolve([]);
          }
        }, 5000); // 5 second timeout

      } catch (error) {
        console.error('[DisintegrationEffect] Error creating disintegration effect:', error);
        resolve([]);
      }
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

      // Replace image src attributes with proxy URLs BEFORE html2canvas
      // This ensures images are already loaded via proxy when html2canvas processes them
      const originalSrcs: Map<HTMLImageElement, string> = new Map();
      if (cardFrontRef.value) {
        console.log('[DisintegrationEffect] Pre-proxying images before capture...');
        const images = cardFrontRef.value.querySelectorAll('img');
        
        images.forEach((img, index) => {
          const htmlImg = img as HTMLImageElement;
          const currentSrc = htmlImg.getAttribute('src') || htmlImg.src;
          
          if (currentSrc && 
              !currentSrc.startsWith('/api/image-proxy') && 
              !currentSrc.startsWith('data:') &&
              !currentSrc.startsWith('blob:')) {
            try {
              const url = new URL(currentSrc, window.location.href);
              if (url.origin !== window.location.origin) {
                // Store original src
                originalSrcs.set(htmlImg, currentSrc);
                
                // Replace with proxy URL
                const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(currentSrc)}`;
                console.log(`[DisintegrationEffect] Pre-proxying image ${index + 1}`);
                htmlImg.crossOrigin = 'anonymous';
                htmlImg.setAttribute('src', proxyUrl);
                htmlImg.src = proxyUrl;
              }
            } catch (e) {
              console.warn(`[DisintegrationEffect] Invalid URL for image ${index + 1}:`, e);
            }
          }
        });
        
        // Wait for images to load via proxy
        if (images.length > 0) {
          console.log(`[DisintegrationEffect] Waiting for ${images.length} images to load via proxy...`);
          await Promise.all(Array.from(images).map((img, index) => {
            return new Promise<void>((resolve) => {
              const htmlImg = img as HTMLImageElement;
              if (htmlImg.complete && htmlImg.naturalWidth > 0) {
                resolve();
                return;
              }
              
              htmlImg.onload = () => resolve();
              htmlImg.onerror = () => resolve(); // Resolve anyway
              setTimeout(() => resolve(), 3000); // Timeout
            });
          }));
          console.log('[DisintegrationEffect] Images pre-loaded via proxy');
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
            console.log('[DisintegrationEffect] onclone: Processing cloned document...');
            const clonedElement = element || clonedDoc.body;
            
            // Ensure crossOrigin is set on all images in the clone
            const images = clonedElement.querySelectorAll('img');
            console.log(`[DisintegrationEffect] onclone: Found ${images.length} images`);
            images.forEach((img, index) => {
              const htmlImg = img as HTMLImageElement;
              htmlImg.crossOrigin = 'anonymous';
              
              // Remove images with invalid dimensions to avoid createPattern errors
              if (htmlImg.naturalWidth === 0 || htmlImg.naturalHeight === 0) {
                console.warn(`[DisintegrationEffect] onclone: Image ${index + 1} has invalid dimensions, hiding it`);
                htmlImg.style.display = 'none';
                htmlImg.src = '';
              }
            });
            
            // Handle background images in computed styles - remove problematic ones
            const allElements = clonedElement.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const computedStyle = window.getComputedStyle(htmlEl);
              const bgImage = computedStyle.backgroundImage;
              
              if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
                const bgImageMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
                if (bgImageMatch && bgImageMatch[1]) {
                  const bgUrl = bgImageMatch[1];
                  
                  // For data URLs (SVG noise), keep them but ensure they're valid
                  if (bgUrl.startsWith('data:')) {
                    // Data URLs should be fine, but check if element has valid dimensions
                    const width = parseInt(computedStyle.width) || 0;
                    const height = parseInt(computedStyle.height) || 0;
                    if (width === 0 || height === 0) {
                      // Element has no dimensions, remove background to avoid createPattern error
                      htmlEl.style.backgroundImage = 'none';
                    }
                  } else if (!bgUrl.includes('/api/image-proxy') && 
                             !bgUrl.startsWith('blob:')) {
                    // External URL - try to proxy it
                    try {
                      const url = new URL(bgUrl, window.location.href);
                      if (url.origin !== window.location.origin) {
                        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(bgUrl)}`;
                        htmlEl.style.backgroundImage = `url(${proxyUrl})`;
                      }
                    } catch (e) {
                      // Invalid URL or element has no dimensions - remove background
                      htmlEl.style.backgroundImage = 'none';
                    }
                  }
                }
              }
              
              // Check if element has valid dimensions - if not, remove background images
              const width = parseInt(computedStyle.width) || 0;
              const height = parseInt(computedStyle.height) || 0;
              if ((width === 0 || height === 0) && computedStyle.backgroundImage !== 'none') {
                htmlEl.style.backgroundImage = 'none';
              }
            });
            
            console.log('[DisintegrationEffect] onclone: Processing complete');
          } catch (e) {
            console.error('[DisintegrationEffect] Error in onclone callback:', e);
          }
        },
        ignoreElements: (element) => {
          // Ignore images with invalid dimensions to avoid createPattern errors
          if (element instanceof HTMLImageElement) {
            if (element.naturalWidth === 0 || element.naturalHeight === 0) {
              return true;
            }
          }
          
          // Ignore elements with background images but no valid dimensions
          if (element instanceof HTMLElement) {
            const computedStyle = window.getComputedStyle(element);
            const bgImage = computedStyle.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
              const width = parseInt(computedStyle.width) || 0;
              const height = parseInt(computedStyle.height) || 0;
              if (width === 0 || height === 0) {
                return true; // Ignore elements with background images but no dimensions
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
    createDisintegrationEffectDOM,
    findCardImageElement,
    captureCardSnapshot,
    clearSnapshots,
  };
}

