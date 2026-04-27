import { useEffect, useRef } from 'react';
import { getLuminance, getContrastRatio, parseRGB } from '../utils/contrast';

export function useAdaptiveContrast() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    
    // We use a small timeout to ensure styles are fully computed after render
    const timeoutId = setTimeout(() => {
      try {
        const styles = window.getComputedStyle(el);
        
        // Get text color
        const textColor = parseRGB(styles.color);
        
        // Traverse up to find the nearest non-transparent background
        let bgNode: HTMLElement | null = el;
        let bgColor: [number, number, number] = [255, 255, 255]; // default to white
        let bgAlpha = 0;
        
        while (bgNode && bgAlpha === 0) {
          const bgStyles = window.getComputedStyle(bgNode);
          const match = bgStyles.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
          if (match) {
            bgAlpha = match[4] !== undefined ? parseFloat(match[4]) : 1;
            if (bgAlpha > 0) {
              bgColor = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
            }
          }
          bgNode = bgNode.parentElement;
        }

        const textLum = getLuminance(...textColor);
        const bgLum = getLuminance(...bgColor);
        const ratio = getContrastRatio(textLum, bgLum);

        // If contrast is less than WCAG AA standard (4.5:1)
        if (ratio < 4.5) {
          // Determine if we should lighten or darken the text
          const shouldLighten = bgLum < 0.5;
          
          // Apply a CSS filter to adjust lightness without changing the hue
          // We use brightness/contrast filters to dynamically push the color
          const adjustment = shouldLighten ? 'brightness(1.5) contrast(1.2)' : 'brightness(0.5) contrast(1.2)';
          
          el.style.filter = adjustment;
          
          // Fallback: add a subtle text shadow to guarantee readability
          el.style.textShadow = shouldLighten 
            ? '0 1px 3px rgba(0,0,0,0.8)' 
            : '0 1px 3px rgba(255,255,255,0.8)';
        }
      } catch (e) {
        console.error("Error calculating adaptive contrast", e);
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, []);

  return ref;
}
