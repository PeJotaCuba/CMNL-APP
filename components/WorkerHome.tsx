import React, { useState, useEffect, useRef } from 'react';
import { AppView, NewsItem, User, ChatMessage } from '../types';
import { Radio, CalendarDays, Music, FileText, Podcast, LogOut, User as UserIcon, MessageSquare, Send, X, ArrowLeft } from 'lucide-react';
import { LOGO_URL } from '../utils/scheduleData';

interface Props {
  onNavigate: (view: AppView, data?: any) => void;
  news: NewsItem[];
  currentUser: User | null;
  onLogout: () => void;
  users?: User[];
  messages?: ChatMessage[];
  onSendMessage?: (to: string, content: string) => void;
}

const WorkerHome: React.FC<Props> = ({ onNavigate, news, currentUser, onLogout, users, messages = [], onSendMessage }) => {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [messageText, setMessageText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carousel logic
  useEffect(() => {
    if (news.length > 1) {
      const interval = setInterval(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % Math.min(news.length, 5));
      }, 5000); 
      return () => clearInterval(interval);
    }
  }, [news]);

  useEffect(() => {
      if (showChat && chatUser) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
  }, [showChat, chatUser, messages]);

  const displayedNews = news.slice(0, 5);
  const activeNews = displayedNews[currentNewsIndex];
  
  const handleExternalApp = (url: string) => {
    // Navigate directly to trigger potential PWA/App interception by the OS
    window.location.href = url;
  };
  
  // Chat Logic
  const handleSendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if (messageText.trim() && chatUser && onSendMessage) {
          onSendMessage(chatUser.username, messageText);
          setMessageText('');
      }
  };

  const isUserOnline = (username: string) => {
      // Simulate online status: Admin, Director always online, others random
      if (username === 'admin' || username === 'lissell') return true;
      if (username === currentUser?.username) return true;
      // Stable pseudo-random based on char code sum
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
    <div className="relative flex min-h-screen h-full w-full flex-col overflow-x-hidden bg-[#2a1b12] font-display text-white overflow-y-auto no-scrollbar">
      {/* Background Image overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-cover bg-center mix-blend-overlay" 
        style={{ backgroundImage: `url('https://picsum.photos/id/149/1080/1920')` }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#2a1b12]/90 via-[#2a1b12]/80 to-[#2a1b12] pointer-events-none"></div>

      {/* Top Nav */}
      <nav className="relative z-20 w-full px-6 py-6 flex justify-center items-center border-b border-white/5 bg-[#2a1b12]/50 backdrop-blur-sm sticky top-0">
        <div className="flex space-x-8 text-sm font-medium text-[#FFF8DC]/80">
           <button onClick={() => onNavigate(AppView.SECTION_HISTORY)} className="hover:text-white cursor-pointer transition-colors">Historia</button>
           <button onClick={() => onNavigate(AppView.SECTION_PROGRAMMING_PUBLIC)} className="hover:text-white cursor-pointer transition-colors">Programación</button>
           <button onClick={() => onNavigate(AppView.SECTION_ABOUT)} className="hover:text-white cursor-pointer transition-colors">Quiénes Somos</button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 py-8 items-center max-w-2xl mx-auto w-full">
        
        {/* Branding */}
        <div className="flex flex-col items-center justify-center mt-6 mb-12 space-y-4">
           <div className="relative w-28 h-28 flex items-center justify-center">
              <div className="bg-white p-0 rounded-[2rem] border border-white/10 backdrop-blur-md shadow-2xl shadow-black/40 overflow-hidden">
                 <img src={LOGO_URL} alt="CMNL App" className="w-full h-full object-cover" />
              </div>
           </div>
           <div className="text-center">
              <h1 className="text-3xl font-bold tracking-tight text-[#FFF8DC] mb-1">CMNL App</h1>
              <h2 className="text-[#CD853F] text-lg font-medium tracking-[0.2em] uppercase opacity-90">Gestión Interna</h2>
              <p className="text-stone-400 text-xs mt-3 font-serif italic tracking-wide opacity-70">"Voz de la segunda villa cubana"</p>
           </div>
        </div>

        {/* Grid Menu */}
        <div className="w-full grid grid-cols-2 gap-4 mb-10">
           <MenuButton 
            icon={<CalendarDays size={28} />} 
            label="Agenda" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://rcmagenda.vercel.app/#/home')}
           />
           <MenuButton 
            icon={<Music size={28} />} 
            label="Música" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://rcm-musica.vercel.app/')}
           />
           <MenuButton 
            icon={<FileText size={28} />} 
            label="Guiones" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://guion-bd.vercel.app/')}
           />
           <MenuButton 
            icon={<Podcast size={28} />} 
            label="Programación" 
            subLabel="CMNL" 
            onClick={() => handleExternalApp('https://rcm-programaci-n.vercel.app/')}
           />
        </div>

        {/* News Carousel (Worker View) */}
        {activeNews && (
            <div onClick={() => onNavigate(AppView.SECTION_NEWS_DETAIL, activeNews)} className="w-full mb-8 cursor-pointer group">
                <div className="bg-[#3e2723]/60 rounded-xl p-4 border border-white/5 backdrop-blur-sm hover:border-[#CD853F]/30 transition-all">
                    <h3 className="text-[#CD853F] text-xs font-bold uppercase tracking-widest mb-2">Noticias Recientes</h3>
                    <div className="flex gap-4 items-center">
                        <div className="h-16 w-16 bg-cover bg-center rounded-lg shrink-0" style={{backgroundImage: `url(${activeNews.image})`}}></div>
                        <div>
                            <h4 className="text-sm font-bold leading-tight">{activeNews.title}</h4>
                            <p className="text-xs text-stone-400 mt-1 line-clamp-1">{activeNews.content}</p>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Footer User Info */}
        <div className="mt-auto w-full">
           <div className="bg-[#3e2723]/60 rounded-xl p-4 border border-white/5 flex items-center justify-between backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                 <div className="h-10 w-10 rounded-full bg-stone-700/50 flex items-center justify-center border border-white/10 relative">
                    <UserIcon size={18} className="text-stone-300" />
                    {isUserOnline(currentUser?.username || '') && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-stone-800 rounded-full"></span>
                    )}
                 </div>
                 <div>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wide">Usuario conectado</p>
                    <p className="text-sm text-[#FFF8DC] font-medium">{currentUser?.name}</p>
                    <p className="text-xs text-[#CD853F]">{currentUser?.classification || 'Trabajador'}</p>
                 </div>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => setShowChat(true)} className="text-stone-400 hover:text-[#CD853F] transition-colors p-2 hover:bg-white/5 rounded-full">
                     <MessageSquare size={20} />
                  </button>
                  <button onClick={onLogout} className="text-stone-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                     <LogOut size={20} />
                  </button>
              </div>
           </div>
           
           <div className="text-center mt-8 pb-4">
              <p className="text-[10px] text-stone-600 uppercase tracking-[0.2em]">CMNL App • App Interna</p>
           </div>
        </div>
      </div>
      
      {/* Worker Group FAB */}
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
    </div>
  );
};

const MenuButton = ({ icon, label, subLabel, onClick }: { icon: React.ReactNode, label: string, subLabel: string, onClick: () => void }) => (
  <button onClick={onClick} className="group flex flex-col items-center justify-center aspect-square bg-[#3e2723]/40 hover:bg-[#3e2723] border border-white/5 hover:border-[#CD853F]/30 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-[#CD853F]/10">
     <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#8B4513] to-[#A0522D] flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform duration-300 text-white">
        {icon}
     </div>
     <span className="text-[#FFF8DC] font-medium text-sm text-center leading-tight">
        <span className="block text-xs opacity-60 mb-0.5">{subLabel}</span>
        {label}
     </span>
  </button>
);

export default WorkerHome;