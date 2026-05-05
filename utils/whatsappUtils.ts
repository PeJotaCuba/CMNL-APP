
/**
 * Utility to open WhatsApp or WhatsApp Business in a flexible way.
 * Works on both mobile and desktop.
 */
export const openWhatsApp = (text: string, phone: string = '') => {
  const encodedText = encodeURIComponent(text);
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Use api.whatsapp.com for better cross-platform compatibility
  // This URL structure is known to trigger the app selection (WhatsApp / WhatsApp Business) 
  // more reliably on mobile devices.
  const baseUrl = cleanPhone 
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
    
  window.open(baseUrl, '_blank');
};
