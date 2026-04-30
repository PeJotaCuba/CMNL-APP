import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const InstallPWA: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Check if already installed
        const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        setIsStandalone(standalone);

        // Detect iOS
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(ios);

        // Standard PWA install prompt for Android/Chrome
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Show prompt after a short delay if not already installed
            if (!standalone) {
                const hasDismissed = localStorage.getItem('pwa_install_dismissed');
                if (!hasDismissed) {
                    setTimeout(() => setIsVisible(true), 3000);
                }
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // For iOS, we check manually if we should show the manual instructions
        if (ios && !standalone) {
            const hasDismissed = localStorage.getItem('pwa_install_dismissed');
            if (!hasDismissed) {
                setTimeout(() => setIsVisible(true), 4000);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    const dismissPrompt = () => {
        setIsVisible(false);
        // Persist dismissal so we don't annoy the user
        localStorage.setItem('pwa_install_dismissed', 'true');
    };

    if (isStandalone || !isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-24 left-4 right-4 z-[200] max-w-md mx-auto"
            >
                <div className="bg-[#2C1B15] border border-[#9E7649]/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                    {/* Decorative background circle */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#9E7649]/10 rounded-full blur-2xl"></div>
                    
                    <button 
                        onClick={dismissPrompt}
                        className="absolute top-3 right-3 p-1 text-[#E8DCCF]/40 hover:text-white transition-colors"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-[#9E7649] rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10">
                            <img src="/icons/icon-192-192.png" alt="App Icon" className="w-10 h-10 object-contain rounded-lg" />
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-sm">Instalar CMNL App</h3>
                            <p className="text-[#E8DCCF]/60 text-xs mt-0.5 leading-tight">
                                Disfruta de la mejor experiencia sin usar el navegador.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        {isIOS ? (
                            <div className="bg-black/20 rounded-xl p-3 border border-[#9E7649]/10">
                                <p className="text-[#E8DCCF]/80 text-xs flex items-center gap-2">
                                    <span className="flex items-center justify-center w-5 h-5 bg-white/10 rounded">1</span>
                                    Pulsa el botón de compartir <Share size={14} className="text-[#9E7649]" />
                                </p>
                                <p className="text-[#E8DCCF]/80 text-xs flex items-center gap-2 mt-2">
                                    <span className="flex items-center justify-center w-5 h-5 bg-white/10 rounded">2</span>
                                    Selecciona <span className="font-bold flex items-center gap-1 text-[#9E7649]">"Añadir a pantalla de inicio" <PlusSquare size={14} /></span>
                                </p>
                            </div>
                        ) : (
                            <button 
                                onClick={handleInstallClick}
                                className="w-full bg-[#9E7649] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#8B653D] active:scale-95 transition-all shadow-lg"
                            >
                                <Download size={18} />
                                Instalar Aplicación
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InstallPWA;
