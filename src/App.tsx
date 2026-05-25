import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, seedLuxuryBoutique } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, getDoc } from 'firebase/firestore';
import { Product, Category, CartItem, UserProfile, SiteConfig } from './types';

// Component Imports
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import CheckoutModal from './components/CheckoutModal';
import UserAccount from './components/UserAccount';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';

// Lucide Icons
import { SlidersHorizontal, Search, Sparkles, Filter, X, ArrowUpDown, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  // Global Cloud Synchronized States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [siteConfig, setSiteConfig] = useState<SiteConfig>({
    pixKey: 'dubai@storepix.com.br',
    gateway: 'Stripe',
    instagram: '',
    facebook: '',
    tiktok: '',
    whatsapp: '',
    youtube: '',
    creditCardEnabled: true,
    debitCardEnabled: true,
    pixEnabled: true,
  });

  // Client User Auth Sync States
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Cart & Favorites UI state (With persistent Client Memory fallback)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const mem = localStorage.getItem('dubai_cart_key');
      return mem ? JSON.parse(mem) : [];
    } catch {
      return [];
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const mem = localStorage.getItem('dubai_favs_key');
      return mem ? JSON.parse(mem) : [];
    } catch {
      return [];
    }
  });

  // UI Interactive Window Toggles
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isUserAccountOpen, setIsUserAccountOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Filter Toolbar States
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [selectedSize, setSelectedSize] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');
  const [showFilterDrawer, setShowFilterDrawer] = useState<boolean>(false);
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // 7 Seconds Cinematic Intro timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  // Core Hydration effect: Seeds database if empty, sets up snapshot list listeners for instant UI update
  useEffect(() => {
    // 1. Kickstart Firestore Seeder Engine (Sealing database seeding)
    const initDatabase = async () => {
      await seedLuxuryBoutique();
    };
    initDatabase();

    // 2. Setup Snapshots listeners for products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Product);
      });
      setProducts(list);
    });

    // 3. Setup Categories snap list
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const list: Category[] = [];
      snapshot.forEach((doc) => {
        list.push(doc.data() as Category);
      });
      setCategories(list);
    });

    // 4. Setup general configuration doc
    const unsubConfig = onSnapshot(doc(db, 'siteConfig', 'global'), (snap) => {
      if (snap.exists()) {
        setSiteConfig(snap.data() as SiteConfig);
      }
    });

    return () => {
      unsubProducts();
      unsubCategories();
      unsubConfig();
    };
  }, []);

  // Sync state profiles and monitor Auth transitions
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (srvUser) => {
      setUser(srvUser);
      if (srvUser) {
        fetchUserProfile(srvUser.uid);
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubAuth();
  }, []);

  // Save Cart to local memory on mutate
  useEffect(() => {
    localStorage.setItem('dubai_cart_key', JSON.stringify(cart));
  }, [cart]);

  // Save favorites to memory
  useEffect(() => {
    localStorage.setItem('dubai_favs_key', JSON.stringify(favorites));
  }, [favorites]);

  const fetchUserProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, 'userProfiles', uid));
      if (snap.exists()) {
        setUserProfile(snap.data() as UserProfile);
      }
    } catch (e) {
      console.error('Failed to update client profile state: ', e);
    }
  };

  // Profile refresh helper
  const handleRefreshProfile = () => {
    if (user) {
      fetchUserProfile(user.uid);
    }
  };

  // Determine if active session has admin credentials as stated in credentials rules
  const isAdminUser = user ? (user.email === 'jessicajonas6425@gmail.com' || user.email === 'dubai@x.com') : false;

  // Cart Management callbacks
  const handleAddToCart = (item: CartItem) => {
    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex(
        (c) =>
          c.product.id === item.product.id &&
          c.selectedSize === item.selectedSize &&
          c.selectedColor === item.selectedColor
      );

      if (existingIdx > -1) {
        const nextCart = [...prevCart];
        const nextQty = nextCart[existingIdx].quantity + item.quantity;
        nextCart[existingIdx].quantity = Math.min(item.product.stock, nextQty);
        return nextCart;
      }
      return [...prevCart, item];
    });
    setSelectedProduct(null); // Close modal
    alert(`${item.product.name} foi colocado na sacola!`);
  };

  const handleUpdateCartQty = (productId: string, size: string, color: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
          ) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: Math.min(item.product.stock, Math.max(1, nextQty)) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (productId: string, size: string, color: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
          )
      )
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handleToggleFavorite = (prodId: string) => {
    setFavorites((prev) => {
      if (prev.includes(prodId)) {
        return prev.filter((id) => id !== prodId);
      }
      return [...prev, prodId];
    });
  };

  const handleBuyNow = (item: CartItem) => {
    // Inject immediately into cart or overwrite
    setCart([item]);
    setSelectedProduct(null);
    setIsCheckoutOpen(true);
  };

  // Vitrine Filtering Core Logic
  const activeCategoryObject = categories.find((c) => c.id === activeCategory);
  const inactiveCategories = categories.filter((c) => !c.active).map((c) => c.id);

  // Filter products according to:
  // 1. Is category active (Disabled category products DO NOT show on vitrine - requested constraint)
  // 2. Active selected category path (Ver tudo vs. clothing vs. perfumes)
  // 3. Brand click filter
  // 4. Footwear sizes selection checkbox
  // 5. Pricing Slider thresholds
  // 6. Search input text matching
  const filteredProducts = products.filter((prod) => {
    // Constraint: Check if category is deactivated in admin
    if (inactiveCategories.includes(prod.category)) {
      return false;
    }

    // Category filter
    if (activeCategory !== 'all' && prod.category !== activeCategory) {
      return false;
    }

    // Brand filter
    if (selectedBrand !== 'all' && prod.brand !== selectedBrand) {
      return false;
    }

    // Sizes filter
    if (selectedSize !== 'all' && !prod.sizes.includes(selectedSize)) {
      return false;
    }

    // Max Price filter (promo price evaluates if active, otherwise base price)
    const activeVal = prod.promoPrice || prod.price;
    if (activeVal > maxPrice) {
      return false;
    }

    // Search bar matching
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = prod.name.toLowerCase().includes(q);
      const matchBrand = prod.brand.toLowerCase().includes(q);
      const matchDesc = prod.description.toLowerCase().includes(q);
      return matchName || matchBrand || matchDesc;
    }

    return true;
  });

  // Sorting logics
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.promoPrice || a.price;
    const priceB = b.promoPrice || b.price;
    if (sortBy === 'price-asc') {
      return priceA - priceB;
    }
    if (sortBy === 'price-desc') {
      return priceB - priceA;
    }
    return 0; // Default sorting
  });

  // Extract unique brands for brand filter list
  const uniqueBrands = Array.from(new Set(products.map((p) => p.brand)));

  // Extract unique shoe sizes / clothing sizes for checkbox filter list
  const uniqueSizes = Array.from(new Set(products.flatMap((p) => p.sizes))).sort();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-sans flex flex-col antialiased">
      
      {/* GLOBAL BANNER NEWS */}
      <div className="bg-[#0A0A0A] border-b border-white/5 py-3.5 text-center text-[10px] font-sans font-bold uppercase tracking-[0.25em] text-[#D4AF37]">
        ✦ GANHE 10% DE DESCONTO VIP NA PRIMEIRA COMPRA COM O CUPOM: <span className="text-white font-bold bg-white/5 px-2.5 py-1 rounded-sm border border-[#D4AF37]/35">DUBAI10</span> ✦
      </div>

      {/* Modern navigation */}
      <Navbar
        cart={cart}
        onUpdateCartQty={handleUpdateCartQty}
        onRemoveFromCart={handleRemoveFromCart}
        favorites={favorites}
        products={products}
        onOpenProductDetail={setSelectedProduct}
        user={user}
        userProfile={userProfile}
        onOpenLogin={() => {
          setIsAuthOpen(true);
        }}
        onOpenUserAccount={() => {
          setIsUserAccountOpen(true);
        }}
        onOpenAdmin={() => {
          setIsAdminOpen(true);
        }}
        onCheckout={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else {
            setIsCheckoutOpen(true);
          }
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
        isAdminUser={isAdminUser}
      />

      {/* Main Hero Showcase */}
      {activeCategory === 'all' && !searchQuery && (
        <Hero
          onExploreClick={() => {
            const vitrine = document.getElementById('vitrine-anchor');
            if (vitrine) vitrine.scrollIntoView({ behavior: 'smooth' });
          }}
          onSelectCategory={setActiveCategory}
        />
      )}

      {/* Vitrine Core Grid Area */}
      <main id="vitrine-anchor" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Section Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 text-[#D4AF37] text-[10px] tracking-[0.4em] uppercase font-bold font-sans">
              ✦ EXCLUSIVE CATALOGUE ✦
            </div>
            <h2 className="text-2xl sm:text-4xl font-light text-white font-serif mt-2 tracking-wide text-left">
              {activeCategory === 'all' 
                ? 'Coleção Completa' 
                : activeCategory === 'roupas' 
                  ? 'Vestuário Premium' 
                  : activeCategory === 'tenis' 
                    ? 'Tênis Exclusivos' 
                    : 'Fragrâncias de Luxo'}
            </h2>
          </div>
          
          {/* Quick Filters Action and Sort Menu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilterDrawer(!showFilterDrawer)}
              className={`flex items-center gap-2 rounded-sm border text-[10px] font-bold uppercase tracking-[0.2em] px-5 py-3.5 transition-all cursor-pointer ${
                showFilterDrawer 
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-lg shadow-[#D4AF37]/15' 
                  : 'bg-[#0D0D0D] border-white/10 text-white/70 hover:border-[#D4AF37]/45 hover:text-[#D4AF37]'
              }`}
            >
              <SlidersHorizontal size={13} />
              Filtros Avançados
            </button>

            <div className="flex items-center gap-2 bg-[#0D0D0D] border border-white/10 rounded-sm px-4 py-3">
              <ArrowUpDown size={12} className="text-[#D4AF37]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-[10px] text-white/80 font-bold uppercase tracking-[0.15em] focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="default">Relevância</option>
                <option value="price-asc">Menor Preço</option>
                <option value="price-desc">Maior Preço</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Toolbar Expandable Drawer */}
        <AnimatePresence>
          {showFilterDrawer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-8 rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 mt-2 space-y-5 shadow-inner"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                
                {/* 1. Brands range selector */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-widest">Grife / Fabricante</span>
                  <div className="relative">
                    <select
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="bg-zinc-900 text-zinc-300 text-xs rounded-xl p-3 w-full border border-zinc-850 focus:outline-none"
                    >
                      <option value="all">Todas as Marcas Grifes</option>
                      {uniqueBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Sizes selection picker */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-widest">Tamanho / Variação</span>
                  <div>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value)}
                      className="bg-zinc-900 text-zinc-400 text-xs rounded-xl p-3 w-full border border-zinc-850 focus:outline-none"
                    >
                      <option value="all">Todas as variações</option>
                      {uniqueSizes.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Pricing limits slider */}
                <div className="space-y-2 text-left">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase font-black tracking-widest flex justify-between">
                    <span>Preço Máximo</span>
                    <span className="text-amber-400 font-extrabold">R$ {maxPrice.toLocaleString('pt-BR')}</span>
                  </span>
                  <div className="pt-2">
                    <input
                      type="range"
                      min={200}
                      max={5000}
                      step={100}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[8px] font-mono text-zinc-600 mt-1">
                      <span>R$ 200</span>
                      <span>R$ 5.000</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Reset filter actions button */}
              <div className="flex justify-end pt-3 border-t border-zinc-900/40">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrand('all');
                    setSelectedSize('all');
                    setMaxPrice(5000);
                    setSortBy('default');
                    setSearchQuery('');
                  }}
                  className="text-zinc-500 hover:text-white text-[10px] font-mono font-bold uppercase tracking-widest"
                >
                  Limpar Todos os Filtros
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Catalog Showcase Showcase grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 mt-4">
          {sortedProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              isFavorited={favorites.includes(prod.id)}
              onOpenDetail={() => setSelectedProduct(prod)}
              onToggleFavorite={() => handleToggleFavorite(prod.id)}
            />
          ))}
        </div>

        {/* Empty Search outcome trigger */}
        {sortedProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border border-zinc-900 rounded-3xl bg-zinc-950/20 max-w-lg mx-auto mt-6">
            <Filter size={44} className="text-zinc-700 stroke-[1.2]" />
            <div>
              <h3 className="text-sm font-semibold text-zinc-300">Nenhum artigo encontrado</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-[260px] mx-auto">
                Tente ajustar os parâmetros dos filtros ou use outro descritor na barra superior para encontrar o lote procurado.
              </p>
            </div>
            <button
              onClick={() => {
                setActiveCategory('all');
                setSelectedBrand('all');
                setSelectedSize('all');
                setMaxPrice(5000);
                setSearchQuery('');
              }}
              className="text-xs font-mono font-bold text-amber-500 tracking-widest uppercase border border-amber-500/25 bg-amber-500/5 px-4.5 py-2.5 rounded-lg hover:bg-amber-500/10 transition"
            >
              Ver Tudo
            </button>
          </div>
        )}

      </main>

      {/* Global Boutique Footer and Admin Access Gate representation in line */}
      <Footer
        siteConfig={siteConfig}
        onOpenAdmin={() => {
          if (!user) {
            setIsAuthOpen(true);
          } else if (isAdminUser) {
            setIsAdminOpen(true);
          } else {
            alert('Apenas contas de administradores homologados têm acesso ao controle.');
          }
        }}
      />

      {/* MODAL 1: Product detailed views */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        user={user}
      />

      {/* MODAL 2: Authenticate and Register customer Account dashboard */}
      {isAuthOpen && (
        <UserAccount
          user={user}
          userProfile={userProfile}
          onClose={() => {
            setIsAuthOpen(false);
          }}
          onRefreshProfile={handleRefreshProfile}
          isAdminUser={isAdminUser}
          onOpenAdmin={() => {
            setIsAuthOpen(false);
            setIsAdminOpen(true);
          }}
        />
      )}

      {/* MODAL 3: Logged customer Account detail view */}
      {isUserAccountOpen && (
        <UserAccount
          user={user}
          userProfile={userProfile}
          onClose={() => {
            setIsUserAccountOpen(false);
          }}
          onRefreshProfile={handleRefreshProfile}
          isAdminUser={isAdminUser}
          onOpenAdmin={() => {
            setIsUserAccountOpen(false);
            setIsAdminOpen(true);
          }}
        />
      )}

      {/* MODAL 4: Full-blown business administration dashboard */}
      {isAdminOpen && (
        <AdminPanel
          onClose={() => setIsAdminOpen(false)}
          products={products}
          onRefreshProducts={() => {}}
          categories={categories}
          onRefreshCategories={() => {}}
          siteConfig={siteConfig}
          onRefreshConfig={() => {}}
        />
      )}

      {/* MODAL 5: Dynamic Checkout flow */}
      {isCheckoutOpen && (
        <CheckoutModal
          cart={cart}
          onClose={() => setIsCheckoutOpen(false)}
          onClearCart={handleClearCart}
          user={user}
          siteConfig={siteConfig}
        />
      )}

      {/* Cinematic Luxurious Nitro Intro Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div
            key="luxury-intro"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-[#050505] overflow-hidden text-white"
          >
            {/* Cinematic subtle rotating particle halo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,transparent_65%)]" />
            
            <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-color-dodge bg-no-repeat bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&q=80&w=1200')` }} />
            
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
              className="absolute w-[450px] h-[450px] sm:w-[500px] sm:h-[500px] rounded-full border border-[#D4AF37]/5 border-dashed pointer-events-none"
            />
            
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
              className="absolute w-[380px] h-[380px] sm:w-[420px] sm:h-[420px] rounded-full border border-[#D4AF37]/10 border-t-transparent border-b-transparent pointer-events-none"
            />

            {/* Glowing spot */}
            <span className="absolute h-96 w-96 rounded-full bg-gradient-to-tr from-[#D4AF37]/10 via-[#C5A059]/5 to-transparent filter blur-3xl" />

            {/* Main content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-lg select-none">
              
              {/* Premium Floating Emblem */}
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-6"
              >
                <img
                  src="https://i.postimg.cc/gcq249Yx/Chat-GPT-Image-25-de-mai-de-2026-10-26-40.png"
                  alt="Dubai Store Crest"
                  className="h-28 sm:h-36 w-auto object-contain brightness-110 filter drop-shadow-[0_8px_25px_rgba(212,175,55,0.4)]"
                  referrerPolicy="no-referrer"
                />
              </motion.div>

              {/* Title & Brand Slogan */}
              <motion.h1
                initial={{ opacity: 0, letterSpacing: "0.1em" }}
                animate={{ opacity: 1, letterSpacing: "0.3em" }}
                transition={{ delay: 0.8, duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
                className="font-display text-2xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA7C11]"
              >
                DUBAI STORE
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 1.6, duration: 1.2 }}
                className="mt-3.5 font-sans text-[9px] sm:text-[10px] tracking-[0.45em] uppercase text-zinc-300 font-bold"
              >
                Coleção Privada • Alta Moda & Luxo Supremo
              </motion.p>

              {/* Seamless automated progress system */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2, duration: 1 }}
                className="mt-14 w-56"
              >
                <div className="relative h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ left: "-100%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 7, ease: "easeInOut" }}
                    className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent"
                  />
                  <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 7, ease: "linear" }}
                    className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#AA7C11] to-[#D4AF37]"
                  />
                </div>
                
                <div className="flex items-center justify-between text-[7.5px] font-mono uppercase tracking-[0.25em] text-[#D4AF37] mt-3.5 font-bold">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                  >
                    AUTENTICIDADE SEGURA
                  </motion.span>
                  <span>100% ORIGINAL</span>
                </div>
              </motion.div>

              {/* Skippable Luxury Action */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                whileHover={{ opacity: 1, color: '#D4AF37' }}
                transition={{ delay: 2.5, duration: 1 }}
                onClick={() => setShowIntro(false)}
                className="mt-8 text-[8px] font-mono tracking-[0.2em] text-white/40 uppercase hover:underline transition cursor-pointer"
              >
                ENTRAR AGORA ✦ PULAR APRESENTAÇÃO
              </motion.button>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[7.5px] font-mono tracking-[0.35em] text-white/20 uppercase font-black">
              Couture Internacionais • Curating Prestige
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
