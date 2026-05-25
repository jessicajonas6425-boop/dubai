import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Star, ShoppingBag, Send, MessagesSquare, Check, Sparkles, TrendingUp } from 'lucide-react';
import { Product, CartItem, Review } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

function getMockReviewsForProduct(product: Product): Omit<Review, 'id'>[] {
  const brand = product.brand || 'Grife';
  const name = product.name || 'Produto VIP';
  const cat = (product.category || 'outros').toLowerCase();

  const mockNames = [
    'Mariana Silva', 'Carlos Henrique', 'Aline Fontes', 'Gabriela M.', 
    'Thiago Rezende', 'Bruno Costa', 'Camila Cavalcanti', 'Isabela Nogueira', 
    'Mateus Vasconcelos', 'Renata Azevedo', 'Rodrigo Santoro', 'Amanda Castro',
    'Lucas Lins', 'Beatriz Marinho', 'Felipe Almeida', 'Patrícia Lima'
  ];

  // Pick unique random indices from mockNames
  const getRandomNames = (count: number) => {
    const shuffled = [...mockNames].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  };

  const commentsRoupas = [
    `O caimento desta peça da ${brand} é simplesmente impecável! O tecido tem um toque super macio e as costuras são muito reforçadas. Superou minhas expectativas!`,
    `Comprei esse lote ${name} e todo mundo elogiou no evento. O corte é super sofisticado e o caimento veste perfeitamente. Compra de luxo de verdade.`,
    `Acabamento primoroso. Vale cada centavo pela qualidade da grife ${brand}. O design é elegante, com ótimo caimento e chegou muito rápido!`,
    `Super satisfeito! A costura e a textura do tecido são de outro patamar. Muito confortável, combina com várias ocasiões VIP de alto padrão.`,
    `Adorei o caimento e a elegância. É extremamente confortável e a embalagem veio super cheirosa com detalhes premium da loja. Recomendo muito!`
  ];

  const commentsTenis = [
    `Incrível! O conforto desse calçado é de outro nível e o design do ${name} é surreal de lindo. Os detalhes e materiais da ${brand} chamam muito a atenção!`,
    `Comprei de presente e superou as expectativas. Calça super bem, muito macio por dentro e o acabamento em couro/camurça é de extrema qualidade.`,
    `Muito satisfeito com o lote! O tênis é perfeito, robusto e extremamente moderno. O conforto nas pisadas é indescritível.`,
    `Lindo demais! Parece uma obra de arte nos pés. O acabamento premium da ${brand} é perceptível de longe. Com certeza comprarei mais.`,
    `Sensacional! Conforto absoluto e a estética é maravilhosa. Chamei atenção em todo lugar que fui. Entrega rápida em apenas 2 dias!`
  ];

  const commentsPerfumes = [
    `Fixação absurdamente extraordinária! Projetou por mais de 3 horas na minha pele e o aroma do ${name} ficou por mais de 12 horas. Uma fragrância imponente!`,
    `Muito refinado e elegante. Frasco com peso imponente da ${brand} e spray perfeito. Fragrância maravilhosa para eventos noturnos requintados.`,
    `Cheiro de pura riqueza! Toda vez que uso esse perfume, me perguntam qual é. Fixação nota 10 e rastro espetacular. Produto 100% original.`,
    `Fragrância muito marcante e sedutora. Um perfume de alta presença para quem busca exclusividade. Fixação média de 10h na minha pele.`,
    `Incrível! Abre fresco de forma muito rica e logo evolui para notas amadeiradas sofisticadas. Essência magnífica.`
  ];

  const commentsFallback = [
    `Excelente experiência de compra! O artigo superou todas as minhas expectativas em detalhes e qualidade de fabricação da ${brand}.`,
    `Fiquei impressionada com o cuidado na embalagem e na entrega rápida. O lote ${name} é original e rico em detalhes magníficos.`,
    `Perfeito! Material muito resistente e design requintado de altíssima costura. Com certeza recomendo a loja para compras de luxo.`
  ];

  let activePool = commentsFallback;
  if (cat.includes('roupa') || cat.includes('vest') || cat.includes('camis') || cat.includes('casac') || cat.includes('roupas')) {
    activePool = commentsRoupas;
  } else if (cat.includes('tenis') || cat.includes('tênis') || cat.includes('sapato') || cat.includes('calc') || cat.includes('tenis')) {
    activePool = commentsTenis;
  } else if (cat.includes('perfume') || cat.includes('fragran') || cat.includes('aroma') || cat.includes('perfumes')) {
    activePool = commentsPerfumes;
  }

  // Create a deterministic hash seed based on the productId
  let seed = 0;
  const productId = product.id || 'default_product';
  for (let i = 0; i < productId.length; i++) {
    seed = productId.charCodeAt(i) + ((seed << 5) - seed);
  }

  // Linear Congruential Generator for deterministic pseudo-randomness
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  // Select unique names and comments deterministically based on seed
  const shuffledNames = [...mockNames];
  for (let i = shuffledNames.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    const temp = shuffledNames[i];
    shuffledNames[i] = shuffledNames[j];
    shuffledNames[j] = temp;
  }

  const shuffledComments = [...activePool];
  for (let i = shuffledComments.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    const temp = shuffledComments[i];
    shuffledComments[i] = shuffledComments[j];
    shuffledComments[j] = temp;
  }

  const numReviews = Math.floor(pseudoRandom() * 3) + 3; // 3 to 5 reviews deterministically
  const reviews: Omit<Review, 'id'>[] = [];
  
  for (let i = 0; i < numReviews; i++) {
    const daysAgo = i * 2 + Math.floor(pseudoRandom() * 2) + 2; // 2 to 12 days ago
    const date = new Date('2026-05-20T12:00:00Z'); // Consistent base date
    date.setDate(date.getDate() - daysAgo);

    // Mostly 5 stars, sometimes 4 stars
    const rating = pseudoRandom() > 0.2 ? 5 : 4;

    reviews.push({
      productId: productId,
      userId: `mock_user_${i}_${productId}`,
      userName: shuffledNames[i % shuffledNames.length],
      rating: rating,
      comment: shuffledComments[i % shuffledComments.length] || activePool[i % activePool.length],
      createdAt: date.toISOString()
    });
  }

  return reviews;
}

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  onBuyNow: (item: CartItem) => void;
  user: any; // Firebase user
}

export default function ProductDetailModal({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
  user,
}: ProductDetailModalProps) {
  const [activeImage, setActiveImage] = useState<string>(product ? (product.images[0] || '') : '');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'reviews'>('desc');

  // Review System State
  const [reviewsList, setReviewsList] = useState<Review[]>([]);
  const [userRating, setUserRating] = useState<number>(5);
  const [userComment, setUserComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string>('');

  useEffect(() => {
    if (product) {
      setActiveImage(product.images[0]);
      setSelectedSize(product.sizes[0] || '');
      setSelectedColor(product.colors[0] || '');
      setQuantity(1);
      setActiveTab('desc');
      fetchReviews(product.id);
    }
  }, [product]);

  if (!product) return null;

  async function fetchReviews(productId: string) {
    if (!product) return;
    try {
      const q = query(
        collection(db, 'reviews'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const list: Review[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Review);
      });
      
      const mocks = getMockReviewsForProduct(product);
      // Combine Firestore-submitted real review comments with our highly-curated deterministic mocks
      const combined = [...list, ...mocks];
      setReviewsList(combined);
    } catch (e) {
      console.error('Failed to grab reviews: ', e);
      // Fallback cleanly to beautiful deterministic mocks, even if Firestore is completely offline or permissions fail
      const mocks = getMockReviewsForProduct(product);
      setReviewsList(mocks);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setReviewError('Faça login para postar uma avaliação.');
      return;
    }
    if (!userComment.trim()) {
      setReviewError('Escreva um comentário no campo.');
      return;
    }

    setIsSubmittingReview(true);
    setReviewError('');

    const newReview: Omit<Review, 'id'> = {
      productId: product.id,
      userId: user.uid,
      userName: user.displayName || user.email?.split('@')[0] || 'Cliente VIP',
      rating: userRating,
      comment: userComment,
      createdAt: new Date().toISOString(),
    };

    const reviewPath = 'reviews';
    try {
      await addDoc(collection(db, reviewPath), newReview);
      setUserComment('');
      setUserRating(5);
      fetchReviews(product.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, reviewPath);
    } finally {
      setIsSubmittingReview(false);
    }
  }

  const promoPrice = product.promoPrice || product.price;
  const hasPromo = promoPrice < product.price;

  // Average Rating
  const avgRating = reviewsList.length
    ? (reviewsList.reduce((acc, curr) => acc + curr.rating, 0) / reviewsList.length).toFixed(1)
    : '5.0';

  const handleAddToCartClick = () => {
    onAddToCart({
      product,
      selectedSize,
      selectedColor,
      quantity,
    });
  };

  const handleBuyNowClick = () => {
    onBuyNow({
      product,
      selectedSize,
      selectedColor,
      quantity,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-5xl rounded-sm border border-white/10 bg-[#0A0A0A] shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-thin"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 rounded-full bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors z-[100] cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-start mt-4">
            
            {/* Left Gallery Segment */}
            <div className="space-y-4">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm border border-white/5 bg-[#0e0e0e] group">
                <img
                  src={activeImage || undefined}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />

                {/* Floating zoom badge */}
                <div className="absolute bottom-4 left-4 z-10 backdrop-blur-md bg-[#0A0A0A]/80 rounded-sm px-3 py-1 border border-white/10 flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-[#D4AF37] animate-pulse" />
                  <span className="text-[9px] font-sans text-white/70 uppercase tracking-widest">Edição Limitada</span>
                </div>
              </div>

              {/* Gallery Miniatures */}
              {product.images.length > 1 && (
                <div className="flex gap-3">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(img)}
                      className={`h-20 w-16 overflow-hidden rounded-sm border transition-all bg-[#0e0e0e] cursor-pointer ${
                        activeImage === img ? 'border-[#D4AF37] scale-[0.98]' : 'border-white/5 hover:border-white/20'
                      }`}
                    >
                      <img src={img || undefined} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Details Segment */}
            <div className="space-y-6 flex flex-col justify-between h-full">
              
              <div className="space-y-3">
                
                {/* Brand & Stars summary */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-sans font-bold text-[#D4AF37] uppercase tracking-[0.25em] bg-[#D4AF37]/5 border border-[#D4AF37]/20 px-3.5 py-1.5 rounded-sm">
                    {product.brand}
                  </span>

                  <div className="flex items-center gap-1">
                    <Star size={14} className="fill-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-xs font-bold text-white font-sans">{avgRating}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">({reviewsList.length} avaliações)</span>
                  </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight font-sans tracking-wide">
                  {product.name}
                </h2>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 pt-2">
                  {hasPromo ? (
                    <>
                      <span className="text-xs font-mono text-zinc-500 line-through">
                        R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-xl font-bold text-[#D4AF37] font-sans">
                        R$ {promoPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl font-bold text-[#D4AF37] font-sans">
                      R$ {product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`text-xs font-sans font-bold uppercase tracking-[0.2em] pb-3 px-1 transition-all relative cursor-pointer ${
                    activeTab === 'desc' ? 'text-[#D4AF37]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Descrição
                  {activeTab === 'desc' && (
                    <motion.div layoutId="modalTabId" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`text-xs font-sans font-bold uppercase tracking-[0.2em] pb-3 px-1 ml-6 transition-all relative cursor-pointer ${
                    activeTab === 'reviews' ? 'text-[#D4AF37]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Depoimentos ({reviewsList.length})
                  {activeTab === 'reviews' && (
                    <motion.div layoutId="modalTabId" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
                  )}
                </button>
              </div>

              {/* Tab Content Display */}
              <div className="min-h-[140px]">
                {activeTab === 'desc' ? (
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed font-sans">
                    {product.description}
                  </p>
                ) : (
                  <div className="space-y-4 max-h-[220px] overflow-y-auto scrollbar-thin">
                    {reviewsList.length === 0 ? (
                      <div className="text-center py-6 text-zinc-600 flex flex-col items-center justify-center gap-2">
                        <MessagesSquare size={28} className="stroke-[1.5]" />
                        <span className="text-xs font-serif italic text-white/35">Seja o primeiro a avaliar este produto exclusivo!</span>
                      </div>
                    ) : (
                      reviewsList.map((review) => (
                        <div key={review.id} className="rounded-sm border border-white/5 bg-white/[0.01] p-3 space-y-1.5Packed font-sans">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-300">{review.userName}</span>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  className={i < review.rating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-zinc-800'}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-[11px] text-zinc-400 italic font-serif">"{review.comment}"</p>
                        </div>
                      ))
                    )}

                    {/* Write native review segment */}
                    {user ? (
                      <form onSubmit={handleSubmitReview} className="border-t border-white/5 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-sans text-white/40 uppercase font-bold tracking-wider">MINHA AVALIAÇÃO</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((stars) => (
                              <button
                                type="button"
                                key={stars}
                                onClick={() => setUserRating(stars)}
                                className="p-0.5 cursor-pointer"
                              >
                                <Star
                                  size={16}
                                  className={stars <= userRating ? 'fill-[#D4AF37] text-[#D4AF37]' : 'text-zinc-800 hover:text-[#D4AF37]'}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="relative flex items-center">
                          <input
                            type="text"
                            placeholder="Deixe sua avaliação VIP aqui..."
                            value={userComment}
                            onChange={(e) => setUserComment(e.target.value)}
                            className="bg-white/5 text-white text-xs placeholder-zinc-500 rounded-sm py-3.5 pl-4 pr-10 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full font-serif"
                          />
                          <button
                            type="submit"
                            disabled={isSubmittingReview}
                            className="absolute right-2 text-white/40 hover:text-[#D4AF37] p-2.5 disabled:opacity-20 cursor-pointer"
                          >
                            <Send size={14} />
                          </button>
                        </div>
                        {reviewError && <p className="text-[10px] text-red-400 font-mono mt-0.5">{reviewError}</p>}
                      </form>
                    ) : (
                      <div className="text-[10px] font-sans text-white/30 tracking-wider text-center py-2 uppercase font-semibold">
                        Apenas clientes VIP autenticados podem publicar feedbacks.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Buying Details Selector segment */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                
                {/* Dynamic Size Picker standard */}
                {product.sizes.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-sans text-[#D4AF37] uppercase tracking-[0.2em] font-bold">Selecione o tamanho:</span>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`min-w-11 px-3.5 py-2.5 rounded-sm text-xs font-mono font-bold border transition-all cursor-pointer ${
                            selectedSize === size
                              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                              : 'bg-white/5 text-white/60 border-white/5 hover:text-white hover:border-white/20'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dynamic Colors Picker */}
                {product.colors.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-sans text-[#D4AF37] uppercase tracking-[0.2em] font-bold">Variação / Acabamento:</span>
                    <div className="flex flex-wrap gap-2">
                      {product.colors.map((col) => (
                        <button
                          key={col}
                          onClick={() => setSelectedColor(col)}
                          className={`px-4 py-2 rounded-sm text-xs font-sans tracking-wide border transition-all cursor-pointer ${
                            selectedColor === col
                              ? 'bg-white text-black border-white font-semibold'
                              : 'bg-white/5 text-white/60 border-white/5 hover:text-white'
                          }`}
                        >
                          {col}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Addition quantity tracker */}
                <div className="flex items-center gap-6 pt-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[8px] font-sans text-white/40 uppercase tracking-widest font-bold">Quantidade:</span>
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-sm">
                      <button
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-3 py-2 text-white/50 hover:text-white font-mono cursor-pointer"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="text-xs font-mono font-black text-white px-3">{quantity}</span>
                      <button
                        onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
                        className="px-3 py-2 text-white/50 hover:text-white font-mono cursor-pointer"
                        disabled={quantity >= product.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] font-sans uppercase tracking-widest text-zinc-500 pt-4 font-semibold">
                    Estoque disponível: <span className="text-zinc-300 font-mono font-bold">{product.stock} peças</span>
                  </div>
                </div>

                {/* Big buying CTAs */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <button
                    id="modal-add-to-cart-btn"
                    onClick={handleAddToCartClick}
                    disabled={product.stock <= 0}
                    className="w-full flex items-center justify-center gap-2 rounded-sm border border-white/10 bg-[#0A0A0A] hover:bg-white/5 text-white py-4 text-xs font-sans tracking-[0.2em] font-bold uppercase transition-all duration-300 disabled:opacity-35 cursor-pointer"
                  >
                    <ShoppingBag size={14} className="text-[#D4AF37]" />
                    Sacola
                  </button>
                  <button
                    id="modal-buy-now-btn"
                    onClick={handleBuyNowClick}
                    disabled={product.stock <= 0}
                    className="w-full rounded-sm bg-[#D4AF37] hover:bg-white text-black py-4 text-xs font-sans tracking-[0.2em] font-bold uppercase transition-all duration-300 disabled:opacity-35 cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                  >
                    Comprar Agora
                  </button>
                </div>

              </div>

            </div>

          </div>

        </motion.div>

      </div>
    </AnimatePresence>
  );
}
