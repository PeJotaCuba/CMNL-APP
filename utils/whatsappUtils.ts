
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible and reliable way.
 * Works seamlessly on both mobile (WhatsApp App, WhatsApp Business) and desktop (WhatsApp Web / PC).
 */
export const openWhatsApp = (
  text: string, 
  phone: string = '', 
  variant: 'auto' | 'whatsapp' | 'business' | 'web' = 'auto'
) => {
  const encodedText = encodeURIComponent(text);
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Specific fix for Cuba numbers: if 8 digits starting with 5 or 6, prepend country code 53
  if (cleanPhone.length === 8 && (cleanPhone.startsWith('5') || cleanPhone.startsWith('6'))) {
    cleanPhone = '53' + cleanPhone;
  }
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || navigator.vendor || (window as any).opera);

  if (isMobile && variant !== 'web') {
    // Mobile environment: Identify and open WhatsApp or WhatsApp Business
    if (variant === 'business') {
      const businessIntent = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp.w4b;scheme=whatsapp;end`;
      const fallbackUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
      try {
        window.location.href = businessIntent;
      } catch (e) {
        window.location.href = fallbackUrl;
      }
      return;
    }

    if (variant === 'whatsapp') {
      const standardIntent = `intent://send?phone=${cleanPhone}&text=${encodedText}#Intent;package=com.whatsapp;scheme=whatsapp;end`;
      const fallbackUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
      try {
        window.location.href = standardIntent;
      } catch (e) {
        window.location.href = fallbackUrl;
      }
      return;
    }

    // Auto variant:
    // whatsapp://send triggers Android OS app identification and opens whichever WhatsApp is installed
    // (WhatsApp or WhatsApp Business, or prompts between both if both are present)
    const nativeUri = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
    const webFallback = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    try {
      window.location.href = nativeUri;
      setTimeout(() => {
        const win = window.open(webFallback, '_blank');
        if (!win) {
          const a = document.createElement('a');
          a.href = webFallback;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          setTimeout(() => a.remove(), 300);
        }
      }, 1200);
    } catch (e) {
      window.open(webFallback, '_blank');
    }
    return;
  }

  // PC / Desktop: Open WhatsApp Web directly in a browser tab
  const webUrl = cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;

  try {
    const openedWindow = window.open(webUrl, '_blank', 'noopener,noreferrer');
    if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = webUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => a.remove(), 300);
    }
  } catch (err) {
    console.warn("Error opening WhatsApp Web, falling back to anchor:", err);
    const a = document.createElement('a');
    a.href = webUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 300);
  }
};


