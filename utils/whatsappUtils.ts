
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible way.
 * Works on both mobile and desktop.
 */
export const openWhatsApp = (text: string, phone: string = '') => {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Use wa.me for modern and broad compatibility (handles selection between WhatsApp and Business better)
  const universalUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
    
  // On mobile, sometimes the protocol whatsapp:// works better specifically for opening the app directly
  const protocolUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  // Simple mobile detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Try https://wa.me first as it is the most reliable way to trigger the app chooser
    // including WhatsApp Business.
    window.location.href = universalUrl;
    
    // Safety fallback just in case
    setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.open(universalUrl, '_blank');
      }
    }, 1500);
  } else {
    window.open(universalUrl, '_blank');
  }
};
