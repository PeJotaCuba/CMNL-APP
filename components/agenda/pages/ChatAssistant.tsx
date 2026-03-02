import React from 'react';

interface ChatAssistantProps {
  onSync: () => Promise<boolean>;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ onSync }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <span className="material-symbols-outlined text-6xl text-primary mb-4">smart_toy</span>
      <h2 className="text-xl font-bold text-white mb-2">Asistente IA</h2>
      <p className="text-text-secondary text-sm">El asistente de chat está en desarrollo.</p>
    </div>
  );
};

export default ChatAssistant;
