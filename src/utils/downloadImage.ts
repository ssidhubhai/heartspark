import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

const addWatermark = (element: HTMLElement) => {
  const watermark = document.createElement('div');
  watermark.id = 'heartspark-watermark';
  watermark.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
      <span style="font-size: 18px;">✨</span>
      <span>Find your match at <b style="font-weight: 800; letter-spacing: 0.5px;">Heart Spark</b></span>
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
  
  element.appendChild(watermark);
  return watermark;
};

const getHtmlToImageOptions = () => ({
  backgroundColor: 'transparent',
  pixelRatio: 2, // Higher resolution
  style: {
    transform: 'scale(1)',
    transformOrigin: 'top left'
  },
  filter: (node: HTMLElement) => {
    // Ignore elements with data-html2canvas-ignore attribute (for backward compatibility)
    if (node instanceof HTMLElement && node.dataset.html2canvasIgnore !== undefined) {
      return false;
    }
    return true;
  }
});

export const downloadAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const watermark = addWatermark(element);

  try {
    const dataUrl = await htmlToImage.toPng(element, getHtmlToImageOptions());

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error downloading image:', error);
    alert('Failed to download image. Please try again.');
  } finally {
    if (element.contains(watermark)) {
      element.removeChild(watermark);
    }
  }
};

export const shareAsImage = async (elementId: string, title: string, text: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const watermark = addWatermark(element);

  try {
    const dataUrl = await htmlToImage.toPng(element, getHtmlToImageOptions());
    
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'heartspark-result.png', { type: 'image/png' });

    const shareText = text + "\\n\\nCheck it out at: " + window.location.href;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text: shareText,
        files: [file],
      });
    } else if (navigator.share) {
      await navigator.share({
        title,
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  } catch (error) {
    console.error('Error sharing image:', error);
    alert('Failed to share image. Please try again.');
  } finally {
    if (element.contains(watermark)) {
      element.removeChild(watermark);
    }
  }
};

export const generatePdfBlob = async (elementId: string): Promise<Blob | null> => {
  const element = document.getElementById(elementId);
  if (!element) return null;

  const watermark = addWatermark(element);

  try {
    const dataUrl = await htmlToImage.toPng(element, {
      ...getHtmlToImageOptions(),
      backgroundColor: '#ffffff' // PDF needs white background instead of transparent
    });
    
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [element.offsetWidth, element.offsetHeight]
    });
    
    pdf.addImage(dataUrl, 'PNG', 0, 0, element.offsetWidth, element.offsetHeight);
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    return null;
  } finally {
    if (element.contains(watermark)) {
      element.removeChild(watermark);
    }
  }
};

export const downloadAsPdf = async (elementId: string, filename: string) => {
  const blob = await generatePdfBlob(elementId);
  if (!blob) {
    alert('Failed to generate PDF. Please try again.');
    return;
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

export const shareAsPdf = async (elementId: string, title: string, text: string) => {
  const blob = await generatePdfBlob(elementId);
  if (!blob) {
    alert('Failed to generate PDF. Please try again.');
    return;
  }

  const file = new File([blob], 'heartspark-result.pdf', { type: 'application/pdf' });
  const shareText = text + "\\n\\nCheck it out at: " + window.location.href;

  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title,
        text: shareText,
        files: [file],
      });
    } else if (navigator.share) {
      await navigator.share({
        title,
        text: shareText,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    alert('Failed to share PDF. Please try again.');
  }
};
