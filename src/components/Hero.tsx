import { motion } from 'motion/react';
import { Sparkles, Compass } from 'lucide-react';

interface HeroProps {
  onExploreClick: () => void;
  onSelectCategory: (cat: string) => void;
}

export default function Hero({ onExploreClick, onSelectCategory }: HeroProps) {
  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-[#0A0A0A] flex items-center border-b border-white/5 py-12 lg:py-0">
      
      {/* Background ambient luxury lighting */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-[#D4AF37]/5 blur-[12vh] pointer-events-none" />
        <div className="absolute bottom-1/4 right-10 h-[400px] w-[400px] rounded-full bg-white/[0.02] blur-[10vh] pointer-events-none" />
        {/* Subtle royal mesh pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(rgba(212,175,55,0.06)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      </div>

      {/* Extreme Background Typography */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[14vw] font-black text-white/[0.02] select-none leading-none tracking-tighter font-display z-0 pointer-events-none">
        DUBAI
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 items-center">
          
          {/* Left info column */}
          <div className="flex flex-col justify-center space-y-6 text-left z-10 lg:pr-6">
            <div className="space-y-2">
              <span className="text-[#D4AF37] uppercase text-[10px] tracking-[0.4em] font-bold font-sans block">
                ✦ DUBAI SUPREME LUXURY ✦
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-white leading-[1.1] font-serif">
                Conexão <br />
                <span className="italic font-normal text-[#D4AF37]">Dubai Elite</span>
              </h1>
            </div>
            
            <p className="text-white/60 text-sm leading-relaxed max-w-[320px] font-serif">
              A mais cobiçada seleção inspirada nas maiores boutiques de Dubai. Sneakers ultra-exclusivos, frascos selecionados da alta perfumaria árabe e vestuários de grife de extrema ostentação.
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <button
                id="hero-explore-now-btn"
                onClick={onExploreClick}
                className="px-8 py-4 bg-[#D4AF37] text-black text-[11px] uppercase tracking-[0.2em] font-bold hover:bg-white hover:text-black transition-all rounded-sm font-sans shadow-lg shadow-[#D4AF37]/10 cursor-pointer"
              >
                Comprar Coleção
              </button>
              
              <button
                id="hero-quick-category-roupas"
                onClick={() => onSelectCategory('tenis')}
                className="px-6 py-4 border border-white/10 hover:border-[#D4AF37] text-white hover:text-[#D4AF37] text-[11px] uppercase tracking-[0.2em] font-medium transition-all rounded-sm bg-transparent cursor-pointer"
              >
                Tênis Exclusivos
              </button>
            </div>
          </div>

          {/* Center Column: Arched luxury design with rotating showcase */}
          <div className="flex justify-center items-center relative z-10">
            <div className="w-[280px] sm:w-[355px] h-[480px] bg-gradient-to-b from-white/10 to-transparent rounded-[160px] border border-white/10 relative overflow-hidden flex items-center justify-center backdrop-blur-2xl">
              
              {/* Radial gradient backing */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.1)_0%,transparent_100%)]"></div>
              
              <div className="w-56 h-72 flex flex-col items-center justify-center relative">
                <motion.div 
                  initial={{ rotate: -12 }}
                  whileHover={{ rotate: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="w-44 h-56 bg-gradient-to-br from-zinc-900 to-black rounded-2xl flex flex-col items-center justify-center shadow-2xl cursor-pointer border border-white/10 relative group"
                >
                  <img
                    src="https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=400&q=80"
                    alt="Exclusive Collection Item"
                    className="w-full h-full object-cover rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  
                  {/* Floating Gold Border Accent */}
                  <div className="absolute inset-2 border border-[#D4AF37]/20 rounded-xl group-hover:border-[#D4AF37]/50 transition-colors pointer-events-none" />
                  
                  <span className="absolute bottom-4 left-4 text-white/40 text-[8px] uppercase tracking-widest font-mono">
                    DUBAI EDITION Nº 01
                  </span>
                </motion.div>
              </div>

              {/* Lower tag display */}
              <div className="absolute bottom-10 text-center px-4">
                <p className="text-[9px] uppercase tracking-[0.3em] text-[#D4AF37] mb-1 font-sans">
                  ✧ Direto de Dubai ✧
                </p>
                <h3 className="text-lg font-light tracking-wide text-white font-display">
                  Dubai Gold Air Edition
                </h3>
              </div>
            </div>
          </div>

          {/* Right Column: Key limited stats with exquisite borders */}
          <div className="flex flex-col items-end justify-center space-y-10 z-10 text-right lg:pl-6">
            
            <div className="space-y-1">
              <div className="text-4xl font-light text-white font-display">
                98 <span className="text-xs text-[#D4AF37] uppercase tracking-widest ml-1 font-sans font-bold">Lotes</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-sans">
                Importações Reais da Península Arábica
              </div>
            </div>

            <div className="space-y-3.5 w-full max-w-[200px] border-t border-b border-white/10 py-5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60 font-serif lowercase italic">qualidade</span>
                <span className="text-[10px] uppercase tracking-widest font-sans font-bold text-[#D4AF37]">100% Autêntico</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60 font-serif lowercase italic">origem</span>
                <span className="text-[10px] uppercase tracking-widest font-sans font-bold text-white">Importação Dubai</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60 font-serif lowercase italic">entrega</span>
                <span className="text-[10px] uppercase tracking-widest font-sans font-bold text-white">Envio Veloz Segurado</span>
              </div>
            </div>

            <div className="flex justify-start items-center gap-3 bg-zinc-950/40 p-3 rounded-md border border-white/5">
              <Sparkles size={16} className="text-[#D4AF37]" />
              <div className="text-left">
                <p className="text-[9px] uppercase tracking-[0.1em] text-white/40 font-sans">Padrão de Segurança</p>
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#D4AF37] font-bold font-sans">Criptografia SSL VIP</p>
              </div>
            </div>

          </div>

        </div>
      </div>

    </section>
  );
}
