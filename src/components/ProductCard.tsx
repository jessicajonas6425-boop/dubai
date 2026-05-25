import { motion } from 'motion/react';
import { Heart, Sparkles } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: any;
  product: Product;
  isFavorited: boolean;
  onOpenDetail: () => void;
  onToggleFavorite: () => void;
  onQuickAdd?: (e: any) => void;
}

export default function ProductCard({
  product,
  isFavorited,
  onOpenDetail,
  onToggleFavorite,
}: ProductCardProps) {
  const price = product.price;
  const promoPrice = product.promoPrice || price;
  const hasPromo = promoPrice < price;
  const discountPercent = hasPromo ? Math.round(((price - promoPrice) / price) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group relative flex flex-col overflow-hidden bg-[#0F0F0F] rounded-sm border border-white/5 p-4 h-full cursor-pointer hover:border-[#D4AF37]/35 hover:bg-[#121212] transition-all duration-300 select-none shadow-md"
      onClick={onOpenDetail}
    >
      
      {/* Visual Image container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-[#161616] border border-white/5">
        
        {/* Badges container */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          {product.isNew && (
            <span className="inline-flex items-center bg-white text-black px-2 py-0.5 text-[8px] font-sans font-bold uppercase tracking-widest rounded-sm shadow-sm">
              NOVO LOTE
            </span>
          )}
          {hasPromo && (
            <span className="inline-flex items-center bg-[#D4AF37] text-black px-2 py-0.5 text-[8px] font-sans font-bold uppercase tracking-widest rounded-sm shadow-sm">
              -{discountPercent}% ESPECIAL
            </span>
          )}
        </div>

        {/* Favorite Icon button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-sm backdrop-blur-md transition-all border ${
            isFavorited
              ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/45'
              : 'bg-black/50 text-white/50 border-white/5 hover:bg-black/80 hover:text-[#D4AF37] hover:border-[#D4AF37]/20 shadow-inner'
          }`}
          aria-label="Add to Favorites"
        >
          <Heart size={14} fill={isFavorited ? 'currentColor' : 'none'} className="transition-transform duration-300 hover:scale-110" />
        </button>

        {/* Core Product image with soft luxury filter */}
        <img
          src={product.images?.[0] || undefined}
          alt={product.name}
          className="h-full w-full object-cover rounded-sm grayscale-[10%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-out"
          referrerPolicy="no-referrer"
          loading="lazy"
        />

        {/* Hover Action overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-6 select-none">
          <span className="text-[9px] font-sans font-bold uppercase tracking-[0.25em] text-white bg-black/80 backdrop-blur-md rounded-sm px-4.5 py-2.5 border border-[#D4AF37]/30 group-hover:border-[#D4AF37] shadow-lg transition-colors">
            Visualizar Lote
          </span>
        </div>
      </div>

      {/* Product metadata */}
      <div className="mt-4 flex flex-1 flex-col justify-between">
        <div className="space-y-1.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-sans uppercase tracking-[0.25em] text-[#D4AF37] font-bold">
              {product.brand}
            </span>
            <span className="text-[8px] font-mono uppercase border border-white/10 px-1.5 py-0.5 rounded-sm text-white/40 tracking-[0.1em]">
              {product.category === 'roupas' ? 'Vestuário' : product.category === 'tenis' ? 'Tênis' : 'Perfume'}
            </span>
          </div>
          
          <h3 className="text-sm font-light text-white font-serif line-clamp-1 leading-normal tracking-wide group-hover:text-[#D4AF37] transition-colors">
            {product.name}
          </h3>
          <p className="text-[11px] text-white/50 font-serif italic truncate">
            {product.description || 'Frasco importado de coleção imperial.'}
          </p>
        </div>

        {/* Price & availability info wrapper */}
        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
          <div className="flex flex-col text-left">
            {hasPromo ? (
              <>
                <span className="text-[9px] font-mono text-white/40 line-through">
                  R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[13px] font-bold text-[#D4AF37] font-sans mt-0.5 tracking-wide">
                  R$ {promoPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </>
            ) : (
              <span className="text-[13px] font-bold text-white font-sans tracking-wide">
                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="text-[8px] tracking-widest font-sans uppercase">
            {product.stock > 0 ? (
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-sm border border-emerald-500/20">
                VIP {product.stock}
              </span>
            ) : (
              <span className="text-white/30 font-bold bg-white/5 px-2 py-1 rounded-sm border border-white/5">
                ESGOTADO
              </span>
            )}
          </div>
        </div>

        {/* Luxury "Adquirir • Comprar" Gold button */}
        <div className="mt-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetail();
            }}
            className="w-full py-3 px-4 rounded-sm bg-gradient-to-r from-[#AA7C11] via-[#D4AF37] to-[#C5A059] hover:from-[#D4AF37] hover:to-[#F3E5AB] text-black font-sans text-[10px] font-black uppercase tracking-[0.25em] transition-all duration-300 shadow-md shadow-[#D4AF37]/10 hover:shadow-[#D4AF37]/30 border border-[#D4AF37]/30 flex items-center justify-center gap-1.5 cursor-pointer transform hover:scale-[1.02]"
          >
            <Sparkles size={11} className="animate-pulse" />
            Adquirir • Comprar
          </button>
        </div>

      </div>

    </motion.div>
  );
}
