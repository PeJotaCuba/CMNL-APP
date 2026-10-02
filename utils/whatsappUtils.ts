
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible and reliable way.
 * Works seamlessly on both mobile (WhatsApp App) and desktop (WhatsApp Web / PC).
 */
export const openWhatsApp = (text: string, phone: string = '') => {
  const encodedText = encodeURIComponent(text);
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Specific fix for Cuba numbers: if 8 digits starting with 5 or 6, prepend country code 53
  if (cleanPhone.length === 8 && (cleanPhone.startsWith('5') || cleanPhone.startsWith('6'))) {
    cleanPhone = '53' + cleanPhone;
  }
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || navigator.vendor || (window as any).opera);

  // Direct URLs:
  // On PC: web.whatsapp.com takes the user directly to the WhatsApp Web chat interface
  // On Mobile: wa.me / api.whatsapp / whatsapp:// launches the native WhatsApp application
  const mobileUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  const webUrl = cleanPhone
    ? `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://web.whatsapp.com/send?text=${encodedText}`;

  const targetUrl = isMobile ? mobileUrl : webUrl;

  try {
    // Try window.open first
    const openedWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    
    // If window.open was blocked by popup blocker or iframe sandbox, use anchor dispatch
    if (!openedWindow || openedWindow.closed || typeof openedWindow.closed === 'undefined') {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
      }, 300);
    }
  } catch (err) {
    console.warn("Error opening WhatsApp with standard methods, falling back to anchor:", err);
    const a = document.createElement('a');
    a.href = targetUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
    }, 300);
  }
};

