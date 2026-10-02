
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible and reliable way.
 * Works on both mobile and desktop (PC).
 */
export const openWhatsApp = (text: string, phone: string = '') => {
  const encodedText = encodeURIComponent(text);
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Specific fix for Cuba numbers: if 8 digits starting with 5 or 6, prepend country code 53
  if (cleanPhone.length === 8 && (cleanPhone.startsWith('5') || cleanPhone.startsWith('6'))) {
    cleanPhone = '53' + cleanPhone;
  }
  
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const waMeUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;

  if (isMobile) {
    const protocolUrl = cleanPhone
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`
      : `whatsapp://send?text=${encodedText}`;
    
    // Attempt opening native app scheme directly
    try {
      window.location.href = protocolUrl;
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = waMeUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, 700);
    } catch (e) {
      window.open(waMeUrl, '_blank', 'noopener,noreferrer');
    }
  } else {
    // Desktop / PC: Open WhatsApp Web / App directly
    try {
      const opened = window.open(waMeUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        const a = document.createElement('a');
        a.href = waMeUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      const a = document.createElement('a');
      a.href = waMeUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }
};
