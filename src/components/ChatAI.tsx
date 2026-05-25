import { useState } from 'react';
import { MessageSquare, X, Send, Instagram, Facebook, Youtube } from 'lucide-react';
import { SiteConfig } from '../types';

export default function ChatAI({ siteConfig }: { siteConfig: SiteConfig }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([{ role: 'ai', text: "Olá! Como posso ajudar você hoje?" }]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, socialLinks: { instagram: siteConfig.instagram, facebook: siteConfig.facebook, youtube: siteConfig.youtube } }),
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: "Desculpe, tive um erro ao processar. Você pode ver nossas redes abaixo." }]);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-[999] bg-[#D4AF37] text-black p-4 rounded-full shadow-2xl hover:scale-110 transition-transform"
      >
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-[999] w-80 bg-[#0A0A0A] border border-white/10 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-zinc-900 p-4 flex justify-between items-center border-b border-white/5">
            <h4 className="text-sm font-bold text-[#D4AF37]">Concierge Digital</h4>
            <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer"><X size={16} /></button>
        </div>
        <div className="flex-1 p-4 h-64 overflow-y-auto space-y-3">
            {messages.map((m, i) => (
                <div key={i} className={`text-xs ${m.role === 'user' ? 'text-right text-white' : 'text-left text-zinc-400'}`}>
                    {m.text}
                </div>
            ))}
        </div>
        <div className="p-3 border-t border-white/5 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-zinc-900 border border-white/10 rounded px-2 text-xs text-white" placeholder="Mensagem..." />
            <button onClick={sendMessage} className="text-[#D4AF37] cursor-pointer"><Send size={16} /></button>
        </div>
        <div className="p-3 bg-zinc-900 border-t border-white/5 flex justify-center gap-4">
          {siteConfig.instagram && <a href={siteConfig.instagram} target="_blank" rel="noreferrer" className="text-white hover:text-[#D4AF37]"><Instagram size={16} /></a>}
          {siteConfig.facebook && <a href={siteConfig.facebook} target="_blank" rel="noreferrer" className="text-white hover:text-[#D4AF37]"><Facebook size={16} /></a>}
          {siteConfig.youtube && <a href={siteConfig.youtube} target="_blank" rel="noreferrer" className="text-white hover:text-[#D4AF37]"><Youtube size={16} /></a>}
        </div>
    </div>
  );
}
