// @ts-ignore - disintegrate doesn't have TypeScript definitions
import disintegrate from 'disintegrate';

export default defineNuxtPlugin(() => {
  // Initialize disintegrate library
  if (typeof window !== 'undefined' && typeof disintegrate !== 'undefined') {
    try {
      // Create a custom WindParticle type that follows wind direction
      // Particles are fine, move upward with slight horizontal drift, and keep original colors
      const WindParticle = function() {
        this.name = "WindParticle";
        this.animationDuration = 1500; // Longer for more natural movement
        
        // More natural wind effect with variation
        // Wind comes from left to right with upward movement
        const baseWindX = 0.5 + Math.random() * 1.5; // Base horizontal drift (right)
        const windVariation = (Math.random() - 0.5) * 0.8; // Variation in wind direction
        const baseWindY = -(3 + Math.random() * 4); // Upward movement (stronger)
        
        // Store initial values for natural movement
        this.initialSpeedX = baseWindX + windVariation;
        this.initialSpeedY = baseWindY;
        
        // Turbulence effect (wind gusts)
        this.turbulence = 0.1 + Math.random() * 0.2;
        this.turbulencePhase = Math.random() * Math.PI * 2;
        
        // Much finer particles (smaller radius)
        this.radius = 0.8 + Math.random() * 1.5; // 0.8-2.3 pixels (very fine)
        
        // Rotation for more natural movement
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        
        this.draw = (ctx, percent) => {
          // Ensure percent is between 0 and 1
          percent = percent >= 1 ? 1 : (percent < 0 ? 0 : percent);
          
          if(percent < 1 && this.radius > 0) {
            // Natural wind movement with turbulence
            // Wind effect increases over time (particles accelerate)
            const windPower = percent * percent; // Quadratic acceleration
            
            // Add turbulence (wind gusts) for natural variation
            const turbulenceX = Math.sin(this.turbulencePhase + percent * Math.PI * 4) * this.turbulence;
            const turbulenceY = Math.cos(this.turbulencePhase + percent * Math.PI * 3) * this.turbulence * 0.5;
            
            // Calculate position with natural wind movement
            const windX = this.initialSpeedX * percent * 120 + turbulenceX * percent * 50;
            const windY = this.initialSpeedY * percent * 120 + turbulenceY * percent * 30;
            
            // Gravity effect (particles slow down as they rise, then fall slightly)
            const gravityEffect = percent * percent * 15; // Gradual slowdown
            
            const currX = this.startX + windX;
            const currY = this.startY + windY + gravityEffect;
            
            // Size decreases over time (particles shrink and fade)
            const currSize = this.radius * (1 - percent * 0.6); // Shrink to 40% of original
            
            // Opacity fades out gradually with slight variation
            const opacity = (1 - percent) * (0.85 + Math.sin(percent * Math.PI) * 0.1);
            
            // Ensure rgbArray exists and has valid values
            // rgbArray is a Uint8ClampedArray [R, G, B, A] from the screenshot
            if (this.rgbArray && (this.rgbArray.length >= 3 || (this.rgbArray[0] !== undefined && this.rgbArray[1] !== undefined && this.rgbArray[2] !== undefined))) {
              // Handle both regular arrays and Uint8ClampedArray
              const r = Math.max(0, Math.min(255, Math.round(this.rgbArray[0] || 0)));
              const g = Math.max(0, Math.min(255, Math.round(this.rgbArray[1] || 0)));
              const b = Math.max(0, Math.min(255, Math.round(this.rgbArray[2] || 0)));
              
              // Get alpha value (index 3) or default to 255 (fully opaque)
              const alphaValue = this.rgbArray[3] !== undefined ? this.rgbArray[3] : 255;
              const alpha = alphaValue / 255;
              
              // Only draw if color is not fully transparent
              if (alpha > 0.05) {
                ctx.beginPath();
                ctx.arc(currX, currY, currSize, 0, Math.PI * 2);
                // Keep original colors from the card with opacity
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * alpha})`;
                ctx.fill();
              }
            }
          }
        };
      };
      
      // Add the custom particle type
      disintegrate.addParticleType(WindParticle);
      
      disintegrate.init();
      // Make it available globally for easier access
      (window as any).disintegrate = disintegrate;
    } catch (e) {
    }
  }
});

