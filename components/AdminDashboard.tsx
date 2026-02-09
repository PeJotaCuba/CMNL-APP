import React, { useEffect, useState, useRef } from 'react';
import { AppView, NewsItem, User, ChatMessage } from '../types';
import { Settings, ChevronRight, CalendarDays, Music, FileText, Podcast, LogOut, MessageSquare, X, ArrowLeft, Send } from 'lucide-react';
import { getCurrentProgram, LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  users: User[]; 
  currentUser: User | null;
  onLogout: () => void;
  messages?: ChatMessage[];
  onSendMessage?: (to: string, content: string) => void;
}

const AdminDashboard: React.FC<Props> = ({ onNavigate, news, users, currentUser, onLogout, messages = [], onSendMessage }) => {
  const [currentProgram, setCurrentProgram] = useState(getCurrentProgram());
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProgram(getCurrentProgram());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
      if (showChat && chatUser) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [showChat, chatUser, messages]);

  const handleExternalApp = (url: string) => {
    window.location.href = url;
  };

  const latestNews = news.length > 0 ? news[0] : null;

  // Chat Logic
  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (messageText.trim() && chatUser && onSendMessage) {
          onSendMessage(chatUser.username, messageText);
          setMessageText('');
      }
  };

  const isUserOnline = (username: string) => {
      if (username === 'admin' || username === 'lissell') return true;
      if (username === currentUser?.username) return true;
      const sum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return sum % 3 === 0;
  };

  const getConversation = () => {
      if (!chatUser || !currentUser) return [];
      return messages.filter(m => 
        (m.from === currentUser.username && m.to === chatUser.username) || 
        (m.from === chatUser.username && m.to === currentUser.username)
      ).sort((a,b) => a.timestamp - b.timestamp);
  };

  return (
    <div className="relative min-h-screen h-full bg-[#1A100C] font-display text-[#E8DCCF] flex flex-col pb-32 overflow-y-auto no-scrollbar">
      
      {/* Top Nav */}
      <nav className="bg-[#3E1E16] text-[#F5EFE6] px-4 py-2 flex items-center justify-center text-[10px] font-medium border-b border-[#9E7649]/20 tracking-wider uppercase sticky top-0 z-30">
        <div className="flex gap-6">
          <button onClick={() => onNavigate(AppView.SECTION_HISTORY)} className="hover:text-[#9E7649] cursor-pointer transition-colors">Historia</button>
          <button onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} className="hover:text-[#9E7649] cursor-pointer transition-colors">Programación</button>
          <button onClick={() => onNavigate(AppView.SECTION_ABOUT)} className="hover:text-[#9E7649] cursor-pointer transition-colors">Quiénes Somos</button>
        </div>
      </nav>

      {/* Header */}
      <header className="sticky top-[33px] z-20 bg-[#1A100C]/95 backdrop-blur-md px-5 py-4 flex items-center justify-between border-b border-[#9E7649]/10 shadow-sm">
         <div className="flex flex-col">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white p-0.5 overflow-hidden">
                    <img src={LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                    <h1 className="text-white font-black text-lg leading-none tracking-tight">CMNL App</h1>
                    <p className="text-[10px] text-[#9E7649]/80 italic mt-0.5 font-serif">Voz de la segunda villa cubana</p>
                </div>
            </div>
         </div>
         <div className="flex items-center gap-3">
             <div className="text-right">
                <p className="text-xs font-bold text-white">{currentUser?.name || 'Admin'}</p>
                <p className="text-[10px] text-[#9E7649] flex items-center justify-end gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {currentUser?.classification || 'Administrador'}
                </p>
             </div>
             <button onClick={() => onNavigate(AppView.APP_USER_MANAGEMENT)} className="w-9 h-9 rounded-full bg-[#2C1B15] flex items-center justify-center hover:bg-[#9E7649]/20 text-[#E8DCCF] transition-colors border border-[#9E7649]/30">
                <Settings size={18} />
             </button>
             <button onClick={onLogout} className="w-9 h-9 rounded-full bg-[#2C1B15] flex items-center justify-center hover:bg-red-900/40 text-[#E8DCCF] hover:text-red-400 transition-colors border border-[#9E7649]/30">
                <LogOut size={18} />
             </button>
         </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 w-full max-w-2xl mx-auto p-5 flex flex-col gap-6">
         
         {/* Welcome (Simplified) */}
         <div className="flex justify-between items-center">
            <h2 className="text-sm text-stone-400 font-medium">Panel de Control</h2>
            <button onClick={() => setShowChat(true)} className="flex items-center gap-2 text-xs font-bold bg-[#3E1E16] px-3 py-1.5 rounded-full border border-[#9E7649]/20 hover:bg-[#9E7649]/20 transition-colors text-[#9E7649]">
                <MessageSquare size={14} /> Mensajería Interna
            </button>
         </div>

         {/* CMNL Apps Grid */}
         <div>
            <h2 className="text-xs font-bold text-[#9E7649] uppercase tracking-widest mb-3">Aplicaciones CMNL</h2>
            <div className="grid grid-cols-4 gap-2">
              <AppButton 
                icon={<CalendarDays size={20} />} 
                label="Agenda" 
                onClick={() => handleExternalApp('https://rcmagenda.vercel.app/#/home')} 
              />
              <AppButton 
                icon={<Music size={20} />} 
                label="Música" 
                onClick={() => handleExternalApp('https://rcm-musica.vercel.app/')} 
              />
              <AppButton 
                icon={<FileText size={20} />} 
                label="Guiones" 
                onClick={() => handleExternalApp('https://guion-bd.vercel.app/')} 
              />
              <AppButton 
                icon={<Podcast size={20} />} 
                label="Progr." 
                onClick={() => handleExternalApp('https://rcm-programaci-n.vercel.app/')} 
              />
            </div>
         </div>

         {/* Live Program Widget with VECTOR */}
         <div>
            <div className="flex items-center justify-between mb-3 px-1">
               <h2 className="text-lg font-bold text-white flex items-center gap-2">
                 <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                 </span>
                 En el Aire
               </h2>
               <button 
                  onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)}
                  className="text-[#9E7649] text-xs font-medium flex items-center gap-0.5 hover:text-[#B68D5D] transition-colors"
                >
                  Ver guía <ChevronRight size={14} />
               </button>
            </div>

            <div className="flex flex-col gap-3">
               <div className="relative bg-[#2C1B15] rounded-xl overflow-hidden border border-[#9E7649]/10 group shadow-lg">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                  <div className="p-4 pl-5 flex items-center gap-4">
                     
                     {/* Vector Visualization */}
                     <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center border border-white/5">
                        <div className="flex gap-1 h-8 items-end">
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_0.8s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_1.2s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_0.5s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_1.0s_ease-in-out_infinite]"></div>
                            <div className="w-1 bg-[#9E7649] animate-[soundbar_0.7s_ease-in-out_infinite]"></div>
                        </div>
                     </div>

                     <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-red-600/20 text-red-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-red-600/20 uppercase tracking-wider">En Vivo</span>
                        </div>
                        <h4 className="text-white font-bold text-lg leading-tight truncate">{currentProgram.name}</h4>
                        <p className="text-[#9E7649] text-xs font-medium mt-1">{currentProgram.time}</p>
                     </div>
                  </div>
                  {/* Background blur effect */}
                  <div className="absolute inset-0 z-[-1] opacity-20 bg-cover bg-center blur-xl" style={{ backgroundImage: `url(${currentProgram.image})` }}></div>
               </div>
            </div>
         </div>

         {/* News Preview */}
         <div>
            <div className="flex justify-between items-center mb-3 px-1">
                 <h2 className="text-lg font-bold text-white">Noticias Recientes</h2>
            </div>

            {latestNews ? (
                <div onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, latestNews)} className="cursor-pointer rounded-xl bg-[#2C1B15] overflow-hidden shadow-sm border border-[#9E7649]/10 hover:border-[#9E7649]/30 transition-all">
                <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${latestNews.image})` }}></div>
                <div className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-bold text-[#9E7649] uppercase tracking-wider bg-[#9E7649]/10 px-1.5 py-0.5 rounded border border-[#9E7649]/20">{latestNews.category}</span>
                        <span className="text-[10px] text-[#E8DCCF]/50">{latestNews.date}</span>
                    </div>
                    <h3 className="text-white font-bold text-base leading-tight mb-1">{latestNews.title}</h3>
                    <p className="text-[#E8DCCF]/70 text-xs line-clamp-2 leading-relaxed">{latestNews.content}</p>
                </div>
                </div>
            ) : (
                <div className="p-6 bg-[#2C1B15] rounded-xl border border-[#9E7649]/10 text-center text-xs text-[#E8DCCF]/50">
                    No hay noticias cargadas. Ir a Ajustes para gestionar.
                </div>
            )}
         </div>
         
      </main>

      {/* FAB - Worker Group */}
      <a 
         href="https://chat.whatsapp.com/BBalNMYSJT9CHQybLUVg5v" 
         target="_blank" 
         rel="noopener noreferrer"
         className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl shadow-black/20 flex items-center justify-center border-2 border-white/10 hover:scale-105 active:scale-95 transition-all"
         title="Grupo de Trabajo WhatsApp"
      >
         <MessageSquare size={28} fill="white" />
      </a>

      {/* Internal Chat Modal */}
      {showChat && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
              <div className="bg-[#1A100C] w-full sm:w-[400px] h-[80vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl flex flex-col shadow-2xl border border-[#9E7649]/20 overflow-hidden">
                  {/* Chat Header */}
                  <div className="bg-[#3E1E16] p-4 flex items-center justify-between border-b border-[#9E7649]/20">
                      {chatUser ? (
                          <div className="flex items-center gap-3">
                              <button onClick={() => setChatUser(null)} className="text-[#E8DCCF] hover:text-white"><ArrowLeft size={20} /></button>
                              <div>
                                  <h3 className="font-bold text-white text-sm">{chatUser.name}</h3>
                                  <span className="text-[10px] text-[#9E7649]">{isUserOnline(chatUser.username) ? 'En línea' : 'Desconectado'}</span>
                              </div>
                          </div>
                      ) : (
                          <h3 className="font-bold text-white">Mensajería Interna</h3>
                      )}
                      <button onClick={() => {setShowChat(false); setChatUser(null);}} className="text-[#E8DCCF]/50 hover:text-white"><X size={24} /></button>
                  </div>

                  {/* Chat Content */}
                  <div className="flex-1 overflow-y-auto bg-[#2a1b12]">
                      {!chatUser ? (
                          // User List
                          <div className="p-2">
                              {users?.filter(u => u.username !== currentUser?.username).map((u, i) => (
                                  <div key={i} onClick={() => setChatUser(u)} className="p-3 flex items-center gap-3 hover:bg-white/5 rounded-lg cursor-pointer transition-colors border-b border-white/5">
                                      <div className="relative">
                                          <div className="w-10 h-10 rounded-full bg-[#3E1E16] flex items-center justify-center text-[#9E7649] font-bold border border-[#9E7649]/20">
                                              {u.username.substring(0,2).toUpperCase()}
                                          </div>
                                          {isUserOnline(u.username) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#2a1b12] rounded-full"></div>}
                                      </div>
                                      <div>
                                          <h4 className="text-sm font-medium text-[#E8DCCF]">{u.name}</h4>
                                          <p className="text-[10px] text-[#9E7649]">{u.classification || 'Usuario'}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          // Conversation View
                          <div className="p-4 flex flex-col gap-3 min-h-full">
                              {getConversation().length === 0 && (
                                  <div className="text-center text-[#E8DCCF]/30 text-xs mt-10">No hay mensajes previos.</div>
                              )}
                              {getConversation().map((msg, i) => {
                                  const isMe = msg.from === currentUser?.username;
                                  return (
                                      <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe ? 'bg-[#9E7649] text-white rounded-br-none' : 'bg-[#3E1E16] text-[#E8DCCF] rounded-bl-none border border-[#9E7649]/20'}`}>
                                              <p>{msg.content}</p>
                                              <span className={`text-[9px] block mt-1 ${isMe ? 'text-black/30' : 'text-white/30'}`}>
                                                  {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                              </span>
                                          </div>
                                      </div>
                                  );
                              })}
                              <div ref={chatEndRef}></div>
                          </div>
                      )}
                  </div>

                  {/* Chat Input */}
                  {chatUser && (
                      <div className="p-3 bg-[#3E1E16] border-t border-[#9E7649]/20">
                          <form onSubmit={handleSendMessage} className="flex gap-2">
                              <input 
                                  type="text" 
                                  value={messageText} 
                                  onChange={(e) => setMessageText(e.target.value)}
                                  placeholder="Escribir mensaje..."
                                  className="flex-1 bg-[#1A100C] border border-[#9E7649]/30 rounded-full px-4 text-sm text-white focus:outline-none focus:border-[#9E7649]"
                              />
                              <button type="submit" disabled={!messageText.trim()} className="w-10 h-10 rounded-full bg-[#9E7649] flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                  <Send size={18} />
                              </button>
                          </form>
                      </div>
                  )}
              </div>
          </div>
      )}
      
      <style>{`
        @keyframes soundbar {
            0%, 100% { height: 10%; }
            50% { height: 100%; }
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

const AppButton = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
    <button onClick={onClick} className="flex flex-col items-center justify-center bg-[#2C1B15] rounded-xl p-3 border border-white/5 hover:bg-[#3E1E16] transition-all">
        <div className="text-[#9E7649] mb-1">{icon}</div>
        <span className="text-[10px] text-[#F5EFE6] font-medium">{label}</span>
    </button>
);

export default AdminDashboard;