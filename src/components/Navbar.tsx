import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Heart, User, Search, Menu, X, Trash2, Plus, Minus, LogOut, Settings, Shield, Smartphone } from 'lucide-react';
import { CartItem, Product, UserProfile } from '../types';

interface NavbarProps {
  cart: CartItem[];
  onUpdateCartQty: (productId: string, size: string, color: string, delta: number) => void;
  onRemoveFromCart: (productId: string, size: string, color: string) => void;
  favorites: string[];
  products: Product[];
  onOpenProductDetail: (product: Product) => void;
  user: any; // Firebase user
  userProfile: UserProfile | null;
  onOpenLogin: () => void;
  onOpenUserAccount: () => void;
  onOpenAdmin: () => void;
  onCheckout: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeCategory: string;
  onCategorySelect: (catId: string) => void;
  isAdminUser: boolean;
  onInstallClick?: () => void;
  showInstallButton?: boolean;
}

export default function Navbar({
  cart,
  onUpdateCartQty,
  onRemoveFromCart,
  favorites,
  products,
  onOpenProductDetail,
  user,
  userProfile,
  onOpenLogin,
  onOpenUserAccount,
  onOpenAdmin,
  onCheckout,
  searchQuery,
  onSearchChange,
  activeCategory,
  onCategorySelect,
  isAdminUser,
  onInstallClick,
  showInstallButton = false,
}: NavbarProps) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSearchPopup, setShowSearchPopup] = useState(false);

  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = cart.reduce((acc, curr) => {
    const price = curr.product.promoPrice || curr.product.price;
    return acc + price * curr.quantity;
  }, 0);

  // Search filter output for instant navbar list
  const filteredSearchDocs = searchQuery.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 5)
    : [];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0A0A0A]/95 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Mobile Menu Trigger */}
          <button
            id="mobile-menu-trigger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-white/60 hover:text-[#D4AF37] md:hidden transition-colors"
            aria-label="Open Menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onCategorySelect('all');
              }}
              className="group flex items-center gap-2 select-none"
            >
              <img
                src="https://i.postimg.cc/gcq249Yx/Chat-GPT-Image-25-de-mai-de-2026-10-26-40.png"
                alt="Dubai Store Logo"
                className="h-10 sm:h-12 w-auto object-contain brightness-110 filter drop-shadow-[0_2px_8px_rgba(212,175,55,0.35)] transition-transform duration-300 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="flex flex-col items-start">
                <span className="font-display text-xs sm:text-base font-bold tracking-[0.2em] text-[#D4AF37] group-hover:text-white transition-colors">
                  DUBAI STORE
                </span>
                <span className="text-[6.5px] sm:text-[7.5px] font-sans tracking-[0.3em] text-white/40 group-hover:text-[#D4AF37] transition-colors block mt-0.5 uppercase">
                  Grifes Importadas
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Categories Toolbar */}
          <nav className="hidden md:flex items-center space-x-10">
            {['all', 'roupas', 'tenis', 'perfumes'].map((cat) => {
              const displayLabel = cat === 'all' ? 'Ver Tudo' : cat === 'roupas' ? 'Vestuário' : cat === 'tenis' ? 'Tênis' : 'Perfumes';
              return (
                <button
                  key={cat}
                  onClick={() => onCategorySelect(cat)}
                  className={`text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 relative py-1 hover:text-[#D4AF37] ${
                    activeCategory === cat
                      ? 'text-[#D4AF37]'
                      : 'text-white/60'
                  }`}
                >
                  {displayLabel}
                  {activeCategory === cat && (
                    <motion.div
                      layoutId="activeCategoryIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#D4AF37]"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Utility Icon Actions */}
          <div className="flex items-center space-x-4 sm:space-x-6">
            
            {/* Expanded Search Icon/Toggle */}
            <div className="relative">
              <button
                id="search-toggle-btn"
                onClick={() => setShowSearchPopup(!showSearchPopup)}
                className="text-zinc-400 hover:text-white transition-colors p-1"
                aria-label="Search"
              >
                <Search size={22} />
              </button>
              
              <AnimatePresence>
                {showSearchPopup && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-3 w-80 rounded-xl bg-zinc-950/95 border border-zinc-900 p-4 shadow-2xl backdrop-blur-xl z-[60]"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        placeholder="Buscar roupas, tênis, perfumes..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-zinc-900/50 text-white placeholder-zinc-500 rounded-lg py-2 pl-4 pr-10 text-sm border border-zinc-800 focus:outline-none focus:border-[#D4AF37]"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => onSearchChange('')}
                          className="absolute right-3 text-zinc-500 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    
                    {filteredSearchDocs.length > 0 && (
                      <div className="mt-3 divide-y divide-zinc-900/50">
                        <div className="text-[10px] font-mono text-zinc-500 mb-1">PRODUTOS ENCONTRADOS</div>
                        {filteredSearchDocs.map((prod) => (
                          <button
                            key={prod.id}
                            onClick={() => {
                              onOpenProductDetail(prod);
                              setShowSearchPopup(false);
                            }}
                            className="flex items-center gap-3 w-full text-left py-2 hover:bg-zinc-900/40 rounded-lg px-2 group transition-all"
                          >
                            <img
                              src={prod.images?.[0] || undefined}
                              alt={prod.name}
                              className="h-10 w-10 object-cover rounded shadow"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-zinc-300 truncate group-hover:text-[#D4AF37]">
                                {prod.name}
                              </p>
                              <p className="text-[10px] font-mono text-zinc-500 uppercase">
                                {prod.brand} • R$ {(prod.promoPrice || prod.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Admin access (if role is admin, show setting quick badge) */}
            {isAdminUser && (
              <button
                id="admin-navbar-badge"
                onClick={onOpenAdmin}
                className="hidden lg:flex items-center gap-1.5 text-xs text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 rounded-full px-3 py-1 font-mono hover:bg-[#D4AF37]/20 transition-all font-bold tracking-wider"
              >
                <Shield size={12} />
                PAINEL ADMIN
              </button>
            )}

            {/* PWA Install Button */}
            {showInstallButton && onInstallClick && (
              <button
                onClick={onInstallClick}
                className="flex items-center gap-1.5 text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-full px-3 py-1 font-mono hover:bg-[#D4AF37]/25 transition-all font-bold tracking-wider uppercase cursor-pointer animate-pulse"
                title="Instalar aplicativo"
              >
                <Smartphone size={11} />
                <span>Instalar App</span>
              </button>
            )}

            {/* Profile Sign-in & Profile dropdown */}
            <button
              id="profile-action-btn"
              onClick={user ? onOpenUserAccount : onOpenLogin}
              className="flex items-center gap-1 text-zinc-400 hover:text-[#D4AF37] transition-colors relative"
              aria-label="User Account"
            >
              <User size={22} />
              {user && (
                <span className="absolute bottom-[-2px] right-[-2px] h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
              )}
            </button>

            {/* Cart Icon Trigger */}
            <button
              id="cart-trigger-btn"
              onClick={() => setIsCartOpen(true)}
              className="text-zinc-400 hover:text-[#D4AF37] transition-colors relative p-1"
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={22} />
              {cartCount > 0 && (
                <motion.div
                  initial={{ scale: 0.5 }}
                  animate={{ scale: 1 }}
                  className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-black shadow-lg"
                >
                  {cartCount}
                </motion.div>
              )}
            </button>

          </div>
        </div>
      </header>

      {/* Slide-out Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-zinc-900 bg-black shadow-2xl"
            >
              {/* Cart Drawer Header */}
              <div className="flex h-20 items-center justify-between border-b border-white/10 px-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-[#D4AF37]" />
                  <span className="font-display text-[15px] uppercase tracking-wider text-white">Seu Carrinho</span>
                  <span className="font-mono text-xs text-white/40">({cartCount} itens)</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="rounded-full bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Cart Drawer List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center space-y-4">
                    <ShoppingBag size={48} className="text-white/10 stroke-[1.5]" />
                    <div>
                      <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider font-display">Carrinho vazio</h3>
                      <p className="text-xs text-white/50 mt-1 max-w-[240px] font-serif">
                        Navegue pelas coleções exclusivas e adicione produtos prêmios ao seu portfólio de estilo.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setIsCartOpen(false);
                        onCategorySelect('all');
                      }}
                      className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#D4AF37] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 border border-[#D4AF37]/25 rounded-sm px-5 py-3 transition-colors cursor-pointer"
                    >
                      Começar a Explorar
                    </button>
                  </div>
                ) : (
                  cart.map((item, index) => {
                    const price = item.product.promoPrice || item.product.price;
                    return (
                      <div
                        key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
                        className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-3 relative group"
                      >
                        <img
                          src={item.product.images?.[0] || undefined}
                          alt={item.product.name}
                          className="h-20 w-16 object-cover rounded bg-neutral-900 border border-white/5"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-white/90 truncate pr-6">
                            {item.product.name}
                          </h4>
                          <p className="text-[10px] font-mono text-white/40 mt-1 uppercase">
                            Tam: <span className="text-white/80">{item.selectedSize}</span> • Cor: <span className="text-white/80">{item.selectedColor}</span>
                          </p>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs font-bold text-[#D4AF37]">
                              R$ {(price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>

                            {/* Qty controls */}
                            <div className="flex items-center bg-white/5 border border-white/10 rounded">
                              <button
                                onClick={() => onUpdateCartQty(item.product.id, item.selectedSize, item.selectedColor, -1)}
                                className="p-1 text-white/65 hover:text-white disabled:opacity-20 select-none cursor-pointer"
                                disabled={item.quantity <= 1}
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-[11px] font-mono font-bold text-white px-2">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => onUpdateCartQty(item.product.id, item.selectedSize, item.selectedColor, 1)}
                                className="p-1 text-white/65 hover:text-white cursor-pointer"
                                disabled={item.quantity >= item.product.stock}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          onClick={() => onRemoveFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                          className="absolute top-3 right-3 text-white/30 hover:text-red-400 transition-colors"
                          aria-label="Remove Item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Cart Drawer Footer */}
              {cart.length > 0 && (
                <div className="border-t border-white/10 p-6 bg-white/[0.01] space-y-4">
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-white/50 text-xs">
                      <span>Subtotal estimado</span>
                      <span className="text-white font-bold font-mono">
                        R$ {cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-white/50 text-xs text-emerald-400">
                      <span>Frete Internacional</span>
                      <span className="font-mono font-bold uppercase tracking-widest text-[9px] bg-emerald-500/10 px-2 py-0.5 rounded-sm">COMPLEMENTAR VIP</span>
                    </div>
                    <div className="border-t border-white/10 my-2 pt-2 flex items-center justify-between text-white font-bold">
                      <span className="text-xs uppercase tracking-wider">Total Geral</span>
                      <span className="text-base text-[#D4AF37] font-extrabold font-mono">
                        R$ {cartSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      onCheckout();
                    }}
                    className="w-full bg-[#D4AF37] hover:bg-white text-black py-4 font-sans text-[11px] uppercase tracking-[0.2em] font-bold transition-all rounded-sm shadow-xl shadow-[#D4AF37]/10 block text-center cursor-pointer"
                  >
                    Finalizar Compra
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Drawer menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/80 md:hidden"
            />

            {/* Mobile Sidebar */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed bottom-0 left-0 top-0 z-50 flex h-full w-4/5 max-w-xs flex-col border-r border-white/5 bg-[#0A0A0A] p-6 shadow-2xl md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <img
                    src="https://i.postimg.cc/gcq249Yx/Chat-GPT-Image-25-de-mai-de-2026-10-26-40.png"
                    alt="Dubai Store Logo"
                    className="h-9 w-auto object-contain brightness-110"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-display text-sm font-bold tracking-[0.2em] text-[#D4AF37]">
                    DUBAI STORE
                  </span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-full bg-white/5 p-1 text-white/50"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="text-[9px] font-sans text-white/40 tracking-[0.2em] uppercase font-bold">Categorias</div>
                <div className="flex flex-col space-y-4">
                  {['all', 'roupas', 'tenis', 'perfumes'].map((cat) => {
                    const displayLabel = cat === 'all' ? 'Ver Tudo' : cat === 'roupas' ? 'Vestuário' : cat === 'tenis' ? 'Tênis' : 'Perfumes';
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          onCategorySelect(cat);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`text-left text-xs font-bold tracking-[0.15em] uppercase py-1.5 border-l-2 pl-3 ${
                          activeCategory === cat
                            ? 'border-[#D4AF37] text-[#D4AF37]'
                            : 'border-transparent text-white/50 hover:text-white'
                        }`}
                      >
                        {displayLabel}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Admin Panel and Profile logs button inside mobile */}
              <div className="border-t border-white/10 pt-6 space-y-3">
                {showInstallButton && onInstallClick && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onInstallClick();
                    }}
                    className="flex items-center gap-2 text-xs text-[#D4AF37] font-mono py-2 w-full text-left font-bold tracking-wider uppercase animate-pulse"
                  >
                    <Smartphone size={14} />
                    Instalar Aplicativo
                  </button>
                )}
                {isAdminUser && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenAdmin();
                    }}
                    className="flex items-center gap-2 text-xs text-[#D4AF37] font-mono py-2 w-full text-left font-bold tracking-wider"
                  >
                    <Shield size={14} />
                    Painel Administrador
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    user ? onOpenUserAccount() : onOpenLogin();
                  }}
                  className="flex items-center gap-2 text-xs text-white/60 hover:text-white py-2 w-full text-left"
                >
                  <User size={14} />
                  {user ? 'Minha Conta' : 'Fazer Login'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
