import * as htmlToImage from 'html-to-image';

export const downloadAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Create a beautiful watermark element
  const watermark = document.createElement('div');
  watermark.id = 'heartspark-watermark';
  watermark.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span style="font-size: 18px;">✨</span>
      <span>Find your match at <b style="font-weight: 800; letter-spacing: 0.5px;">HeartSpark.com</b></span>
      <span style="font-size: 18px;">💖</span>
    </div>
  `;
  watermark.style.textAlign = 'center';
  watermark.style.color = '#ec4899'; // Tailwind pink-500
  watermark.style.fontSize = '15px';
  watermark.style.fontFamily = '"Inter", system-ui, -apple-system, sans-serif';
  watermark.style.marginTop = '10px';
  watermark.style.paddingTop = '20px';
  watermark.style.paddingBottom = '10px';
  watermark.style.borderTop = '2px dashed rgba(236, 72, 153, 0.2)';
  watermark.style.width = '100%';
  
  // Append to the element before taking the snapshot
  element.appendChild(watermark);

  try {
    const dataUrl = await htmlToImage.toPng(element, {
      backgroundColor: 'transparent',
      pixelRatio: 2, // Higher resolution
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left'
      },
      filter: (node) => {
        // Ignore elements with data-html2canvas-ignore attribute (for backward compatibility)
        if (node instanceof HTMLElement && node.dataset.html2canvasIgnore !== undefined) {
          return false;
        }
        return true;
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error downloading image:', error);
    alert('Failed to download image. Please try again.');
  } finally {
    // Remove the watermark so the live UI goes back to normal
    if (element.contains(watermark)) {
      element.removeChild(watermark);
    }
  }
};
