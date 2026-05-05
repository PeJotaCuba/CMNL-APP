
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible way.
 * Works on both mobile and desktop.
 */
export const openWhatsApp = (text: string, phone: string = '') => {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Use api.whatsapp.com for broad compatibility
  const webUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
    
  // On mobile, sometimes the protocol whatsapp:// works better for app selection (Business/Personal)
  const mobileUrl = cleanPhone
    ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
    : `whatsapp://send?text=${encodedText}`;

  // Simple mobile detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  if (isMobile) {
    // Try the protocol first, then fallback to web URL
    const start = Date.now();
    window.location.href = mobileUrl;
    
    // If after 500ms nothing happened, try the web URL as backup
    setTimeout(() => {
      if (Date.now() - start < 1000) {
        window.open(webUrl, '_blank');
      }
    }, 500);
  } else {
    window.open(webUrl, '_blank');
  }
};
