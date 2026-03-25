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

const getHtmlToImageOptions = (element: HTMLElement) => ({
  backgroundColor: 'transparent',
  pixelRatio: 2, // Higher resolution
  width: element.offsetWidth,
  height: element.offsetHeight,
  style: {
    transform: 'scale(1)',
    transformOrigin: 'top left',
    margin: '0',
    padding: '0'
  },
  filter: (node: HTMLElement) => {
    if (node instanceof HTMLElement && node.dataset.html2canvasIgnore !== undefined) {
      return false;
    }
    return true;
  }
});

export const downloadAsImage = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Add a small delay to ensure any animations are settled
  await new Promise(resolve => setTimeout(resolve, 100));

  const watermark = addWatermark(element);

  try {
    const dataUrl = await htmlToImage.toPng(element, getHtmlToImageOptions(element));

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error downloading image:', error);
    throw error; // Let the caller handle it
  } finally {
    if (element.contains(watermark)) {
      element.removeChild(watermark);
    }
  }
};

let isSharing = false;

export const shareAsImage = async (elementId: string, title: string, text: string) => {
  if (isSharing) {
    console.warn('A share operation is already in progress.');
    return;
  }
  
  const element = document.getElementById(elementId);
  if (!element) return;

  isSharing = true;
  
  // Add a small delay to ensure any animations are settled
  await new Promise(resolve => setTimeout(resolve, 100));

  const watermark = addWatermark(element);

  try {
    const options = getHtmlToImageOptions(element);
    const dataUrl = await htmlToImage.toPng(element, options);
    
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], 'heartspark-result.png', { type: 'image/png' });

    const shareText = text + "\n\nCheck it out at: " + window.location.href;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
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
      await navigator.clipboard.writeText(shareText);
      alert('Result copied to clipboard!');
    }
  } catch (error: any) {
    console.error('Error sharing image:', error);
    if (error.name !== 'AbortError') {
      throw error; // Let the caller handle it
    }
  } finally {
    isSharing = false;
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
      ...getHtmlToImageOptions(element),
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
    throw new Error('Failed to generate PDF.');
  }
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

export const shareAsPdf = async (elementId: string, title: string, text: string) => {
  if (isSharing) {
    console.warn('A share operation is already in progress.');
    return;
  }
  
  isSharing = true;
  const blob = await generatePdfBlob(elementId);
  if (!blob) {
    isSharing = false;
    throw new Error('Failed to generate PDF.');
  }

  const file = new File([blob], 'heartspark-result.pdf', { type: 'application/pdf' });
  const shareText = text + "\n\nCheck it out at: " + window.location.href;

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
      await navigator.clipboard.writeText(shareText);
    }
  } catch (error: any) {
    console.error('Error sharing PDF:', error);
    if (error.name !== 'AbortError') {
      throw error;
    }
  } finally {
    isSharing = false;
  }
};
