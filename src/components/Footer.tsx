import { useState } from 'react';
import { Instagram, Facebook, Youtube, Lock, Landmark, FileText, Scale, X } from 'lucide-react';
import { SiteConfig } from '../types';

interface FooterProps {
  siteConfig: SiteConfig;
  onOpenAdmin: () => void;
}

export default function Footer({ siteConfig, onOpenAdmin }: FooterProps) {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <footer className="relative bg-[#070707] border-t border-white/5 py-16 text-zinc-400 select-none">
      
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-left">
          
          {/* Col 1: Brand description and contacts of luxury store */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img
                src="https://i.postimg.cc/gcq249Yx/Chat-GPT-Image-25-de-mai-de-2026-10-26-40.png"
                alt="Dubai Store Logo"
                className="h-10 w-auto object-contain brightness-110 filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)]"
                referrerPolicy="no-referrer"
              />
              <span className="font-display text-base font-bold tracking-[0.2em] text-[#D4AF37]">
                DUBAI STORE
              </span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              Edição premium de vestuário de grife, sneakers raros streetwear e frascos de fragrâncias de luxo dos maiores estilistas do mundo. Presença e exclusividade faturados para todo o Brasil.
            </p>
            <div className="text-[10px] font-mono text-zinc-650 tracking-wider">
              CNPJ: 45.289.412/0001-99 • São Paulo / SP
            </div>
          </div>

          {/* Col 2: Customer Care and legal documents references */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-white">Suporte VIP</h4>
            <div className="flex flex-col space-y-2.5 text-xs text-zinc-500">
              <span className="font-sans">SAC Dubai: 0800-400-LUXO</span>
              <span className="font-sans">Atendimento: Segunda a Sábado</span>
              <a
                href={siteConfig.whatsapp || 'https://wa.me/5511999999999'}
                target="_blank"
                rel="noreferrer"
                className="text-[#D4AF37] hover:text-white font-mono text-[9px] uppercase font-bold tracking-[0.2em] transition-colors"
              >
                Chamar Concierge WhatsApp
              </a>
            </div>
          </div>

          {/* Col 3: Safe policy documents toggles */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-white">Políticas & Termos</h4>
            <div className="flex flex-col space-y-2.5 text-xs">
              <button
                id="footer-privacy-btn"
                onClick={() => setShowPrivacy(true)}
                className="hover:text-white transition w-fit text-zinc-500 text-left cursor-pointer"
              >
                Política de Privacidade
              </button>
              <button
                id="footer-terms-btn"
                onClick={() => setShowTerms(true)}
                className="hover:text-white transition w-fit text-zinc-500 text-left cursor-pointer"
              >
                Termos de Uso
              </button>
              <span className="text-emerald-500 font-sans text-[9px] font-bold tracking-[0.15em] uppercase">✓ SSL ENCRYPTED GATEWAY</span>
            </div>
          </div>

          {/* Col 4: Dynamically social configured lists */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-white">Dubai Hub Social</h4>
            <div className="flex space-x-3">
              {siteConfig.instagram && (
                <a
                  href={siteConfig.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-sm bg-white/5 text-zinc-400 hover:text-[#D4AF37] hover:bg-white/10 transition"
                  aria-label="Instagram"
                >
                  <Instagram size={14} />
                </a>
              )}
              {siteConfig.facebook && (
                <a
                  href={siteConfig.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-sm bg-white/5 text-zinc-400 hover:text-[#D4AF37] hover:bg-white/10 transition"
                  aria-label="Facebook"
                >
                  <Facebook size={14} />
                </a>
              )}
              {siteConfig.youtube && (
                <a
                  href={siteConfig.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 rounded-sm bg-white/5 text-zinc-400 hover:text-[#D4AF37] hover:bg-white/10 transition"
                  aria-label="YouTube"
                >
                  <Youtube size={14} />
                </a>
              )}
            </div>
            
            <div className="pt-2 text-zinc-500 flex items-center gap-1.5 text-[10px] font-sans tracking-wide">
              <Landmark size={12} className="text-[#D4AF37]" />
              Chave PIX: <span className="text-zinc-400 font-mono">{siteConfig.pixKey}</span>
            </div>
          </div>

        </div>

        {/* Elegant divider line */}
        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-10" />

        {/* Foot end line, copyrights and admin gate */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-[10px] tracking-wide text-zinc-650 gap-4">
          <p>© 2026 Dubai Store Ltd. Todos os direitos reservados. Design Imperial de Moda Streetwear e Frascos Prêmios.</p>
          
          <div className="flex items-center gap-4">
            {/* Real-time indicator from design instructions */}
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[9px] font-sans tracking-wider text-emerald-400 font-bold uppercase">CONEXÃO SECURE</span>
            </div>

            {/* Admin link located in the footer according to instructions: "O acesso admin deve ficar no rodapé do site." */}
            <button
              id="admin-footer-gate"
              onClick={onOpenAdmin}
              className="flex items-center gap-1.5 text-[10px] font-sans text-zinc-400 hover:text-[#D4AF37] transition tracking-widest uppercase py-1.5 border border-white/5 bg-white/5 px-4 rounded-sm cursor-pointer font-bold"
            >
              <Lock size={10} className="text-[#D4AF37]" />
              Contrôle Admin
            </button>
          </div>
        </div>

      </div>

      {/* Modern overlays for privacy / terms modal policies */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-sm border border-white/10 bg-[#0A0A0A] p-8 text-left relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowPrivacy(false)} className="absolute top-4 right-4 rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white cursor-pointer">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-6">
              <FileText className="text-[#D4AF37] h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-sans">Política de Privacidade</h3>
            </div>
            <div className="text-xs text-zinc-400 space-y-4 font-sans leading-relaxed">
              <p>O sigilo e proteção de seus dados cadastrais são garantidos na Dubai Store.</p>
              <p>1. Coleta de dados: Suas informações de cadastro, endereços e compras coletadas são estritamente usadas para processar faturas, despachar frotas logísticas terrestres ou aéreas para remessa de sua mercadoria premium.</p>
              <p>2. Segurança: Todos os pagamentos e ordens são tramitados através de criptografia modular via SSL, de modo que suas chaves do cartão de crédito ou dados sensíveis nunca permaneçam arquivadas em nossos servidores.</p>
              <p>3. Compartilhamento: Jamais vendemos ou cedemos informações cadastrais a parceiros comerciais externos sem sua acreditação formal prévia.</p>
            </div>
          </div>
        </div>
      )}

      {showTerms && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full rounded-sm border border-white/10 bg-[#0A0A0A] p-8 text-left relative max-h-[80vh] overflow-y-auto">
            <button onClick={() => setShowTerms(false)} className="absolute top-4 right-4 rounded-full bg-white/5 p-1.5 text-zinc-400 hover:text-white cursor-pointer bg-black/50">
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 mb-6">
              <Scale className="text-[#D4AF37] h-5 w-5" />
              <h3 className="text-sm font-bold text-white uppercase tracking-widest font-sans">Termos de Uso</h3>
            </div>
            <div className="text-xs text-zinc-400 space-y-4 font-sans leading-relaxed">
              <p>Estes termos regulam a navegação e aquisição mercantil na Dubai Store.</p>
              <p>1. Propriedade Intelectual: Todas as marcas exibidas, nomes de linhas criadas, fotografias dos frascos e logomarca "Dubai Store" constituem material protegido por patentes internacionais.</p>
              <p>2. Transações e Estoque: O faturamento definitivo de compras está dependente da verificação e constatação de estoques reais remanescentes no lote VIP. Caso ocorra divergência, o valor integral pago de imediato é revertido via PIX ou estorno no cartão.</p>
              <p>3. Devoluções: Oferecemos suporte internacional para trocas e devoluções voluntárias em até 7 dias após o recebimento dos artigos sem violação de invólucros originais.</p>
            </div>
          </div>
        </div>
      )}

    </footer>
  );
}
