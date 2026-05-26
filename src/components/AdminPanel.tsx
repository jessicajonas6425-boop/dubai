import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Shield, BarChart3, Package, FolderOpen, Percent, Settings, Users, ArrowUpRight, Plus, Edit, Trash2, Check, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Product, Category, Order, UserProfile, Coupon, SiteConfig } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

interface AdminPanelProps {
  onClose: () => void;
  products: Product[];
  onRefreshProducts: () => void;
  categories: Category[];
  onRefreshCategories: () => void;
  siteConfig: SiteConfig;
  onRefreshConfig: () => void;
}

export default function AdminPanel({
  onClose,
  products,
  onRefreshProducts,
  categories,
  onRefreshCategories,
  siteConfig,
  onRefreshConfig,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'categories' | 'orders' | 'coupons' | 'settings' | 'users'>('dashboard');

  // Server Fetched Records
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Form toggles
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);

  // Edit Product Fields
  const [pId, setPId] = useState('');
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pPrice, setPPrice] = useState(0);
  const [pPromoPrice, setPPromoPrice] = useState(0);
  const [pCat, setPCat] = useState('roupas');
  const [pSubcat, setPSubcat] = useState('');
  const [pImageUrl, setPImageUrl] = useState('');
  const [pImages, setPImages] = useState<string[]>(['']);
  const [pStock, setPStock] = useState(5);
  const [pSizes, setPSizes] = useState('');
  const [pColors, setPColors] = useState('');
  const [pBrand, setPBrand] = useState('');
  const [pFeatured, setPFeatured] = useState(false);
  const [pIsNew, setPIsNew] = useState(true);

  // Edit / Create Category fields
  const [newCatId, setNewCatId] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatSubcategories, setNewCatSubcategories] = useState('');

  // Edit / Create Coupon Fields
  const [cCode, setCCode] = useState('');
  const [cDiscount, setCDiscount] = useState(10);
  const [cExpiry, setCExpiry] = useState('2028-12-31');
  const [cActive, setCActive] = useState(true);

  // Site Configurations form
  const [cfgPixKey, setCfgPixKey] = useState('');
  const [cfgGateway, setCfgGateway] = useState<'Stripe' | 'Mercado Pago' | 'PagSeguro'>('Stripe');
  const [cfgInstagram, setCfgInstagram] = useState('');
  const [cfgWhatsapp, setCfgWhatsapp] = useState('');
  const [cfgTiktok, setCfgTiktok] = useState('');
  const [cfgFacebook, setCfgFacebook] = useState('');
  const [cfgYoutube, setCfgYoutube] = useState('');
  const [cfgCreditCard, setCfgCreditCard] = useState(true);
  const [cfgDebitCard, setCfgDebitCard] = useState(true);
  const [cfgPixEnabled, setCfgPixEnabled] = useState(true);
  const [cfgMercadoPagoToken, setCfgMercadoPagoToken] = useState('');
  const [cfgMercadoPagoPublicKey, setCfgMercadoPagoPublicKey] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchOrdersList();
    fetchCouponsList();
    fetchUsersList();
  }, []);

  useEffect(() => {
    // Sync configurations when siteConfig context triggers
    setCfgPixKey(siteConfig.pixKey || '');
    setCfgGateway(siteConfig.gateway || 'Stripe');
    setCfgInstagram(siteConfig.instagram || '');
    setCfgWhatsapp(siteConfig.whatsapp || '');
    setCfgTiktok(siteConfig.tiktok || '');
    setCfgFacebook(siteConfig.facebook || '');
    setCfgYoutube(siteConfig.youtube || '');
    setCfgCreditCard(siteConfig.creditCardEnabled ?? true);
    setCfgDebitCard(siteConfig.debitCardEnabled ?? true);
    setCfgPixEnabled(siteConfig.pixEnabled ?? true);
    setCfgMercadoPagoToken(siteConfig.mercadoPagoToken || '');
    setCfgMercadoPagoPublicKey(siteConfig.mercadoPagoPublicKey || '');
  }, [siteConfig]);

  const fetchOrdersList = async () => {
    setLoadingOrders(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: Order[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Order);
      });
      setOrders(list);
    } catch (e) {
      console.error('Failed to grab admin orders list ', e);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchCouponsList = async () => {
    setLoadingCoupons(true);
    try {
      const snapshot = await getDocs(collection(db, 'coupons'));
      const list: Coupon[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as Coupon);
      });
      setCoupons(list);
    } catch (e) {
      console.error('Failed to grab coupons ', e);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchUsersList = async () => {
    setLoadingUsers(true);
    try {
      const snapshot = await getDocs(collection(db, 'userProfiles'));
      const list: UserProfile[] = [];
      snapshot.forEach(doc => {
        list.push(doc.data() as UserProfile);
      });
      setUsersList(list);
    } catch (e) {
      console.error('Failed to grab registered user profiles ', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Dashboard calculations
  const totalFaturado = orders
    .filter(o => o.status === 'Pago' || o.status === 'Enviado')
    .reduce((a, b) => a + b.total, 0);

  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter(o => o.status === 'Pendente').length;

  const handleOpenProductFormForNew = () => {
    setEditingProduct(null);
    setPId('p-' + Math.floor(100 + Math.random() * 900));
    setPName('');
    setPDesc('');
    setPPrice(290);
    setPPromoPrice(290);
    setPCat(categories[0]?.id || 'roupas');
    setPImageUrl('https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80');
    setPImages(['https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80']);
    setPStock(10);
    setPSizes('40, 41, 42');
    setPColors('Preto, Branco, Dourado');
    setPBrand('');
    setPSubcat('');
    setPFeatured(false);
    setPIsNew(true);
    setShowProductForm(true);
  };

  const handleOpenProductFormForEdit = (prod: Product) => {
    setEditingProduct(prod);
    setPId(prod.id);
    setPName(prod.name);
    setPDesc(prod.description);
    setPPrice(prod.price);
    setPPromoPrice(prod.promoPrice || prod.price);
    setPCat(prod.category);
    setPImageUrl(prod.images?.[0] || '');
    setPImages(prod.images && prod.images.length > 0 ? [...prod.images] : ['']);
    setPStock(prod.stock);
    setPSizes(prod.sizes.join(', '));
    setPColors(prod.colors.join(', '));
    setPBrand(prod.brand);
    setPSubcat(prod.subcategory || '');
    setPFeatured(prod.featured);
    setPIsNew(prod.isNew);
    setShowProductForm(true);
  };

  // Save / Edit Product Actions
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalImages = pImages.map(img => img.trim()).filter(Boolean);
    if (!pName.trim() || !pBrand.trim() || finalImages.length === 0) {
      alert('Preencha os dados básicos do produto (nome, grife e pelo menos 1 URL de imagem).');
      return;
    }

    const compiledProduct: Product = {
      id: pId,
      name: pName,
      description: pDesc,
      price: Number(pPrice),
      promoPrice: Number(pPromoPrice),
      category: pCat,
      subcategory: pSubcat,
      images: finalImages,
      stock: Number(pStock),
      sizes: pSizes.split(',').map(s => s.trim()).filter(Boolean),
      colors: pColors.split(',').map(c => c.trim()).filter(Boolean),
      brand: pBrand,
      featured: pFeatured,
      isNew: pIsNew,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString()
    };

    try {
      const itemsPath = 'products';
      await setDoc(doc(db, itemsPath, pId), compiledProduct);
      alert('Produto salvo com sucesso!');
      setShowProductForm(false);
      onRefreshProducts();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Excluir este produto?')) return;
    try {
      const itemsPath = 'products';
      await deleteDoc(doc(db, itemsPath, id));
      onRefreshProducts();
      alert('Produto removido.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'products');
    }
  };

  // Save Categories
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatId.trim() || !newCatName.trim()) {
      alert('Insira código ID e Nome para a nova categoria.');
      return;
    }

    const nCat: Category = {
      id: newCatId.toLowerCase().trim(),
      name: newCatName.trim(),
      active: true,
      createdAt: new Date().toISOString(),
      subcategories: newCatSubcategories.split(',').map(s => s.trim()).filter(Boolean)
    };

    try {
      const catsPath = 'categories';
      await setDoc(doc(db, catsPath, nCat.id), nCat);
      setNewCatId('');
      setNewCatName('');
      setNewCatSubcategories('');
      onRefreshCategories();
      alert('Categoria criada!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'categories');
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    try {
      const catsPath = 'categories';
      await updateDoc(doc(db, catsPath, cat.id), {
        active: !cat.active
      });
      onRefreshCategories();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'categories');
    }
  };

  // Update order delivery status
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: any) => {
    try {
      const ordersPath = 'orders';
      await updateDoc(doc(db, ordersPath, orderId), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      fetchOrdersList();
      alert('Status do pedido atualizado!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'orders');
    }
  };

  // Add Coupons
  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cCode.trim()) return;

    const newCoupon: Coupon = {
      code: cCode.toUpperCase().trim(),
      discountPercent: Number(cDiscount),
      expiryDate: cExpiry,
      active: cActive,
    };

    try {
      const couponsPath = 'coupons';
      await setDoc(doc(db, couponsPath, newCoupon.code), newCoupon);
      setCCode('');
      fetchCouponsList();
      alert('Voucher Cupom adicionado!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'coupons');
    }
  };

  const handleToggleCouponActive = async (cp: Coupon) => {
    try {
      const couponsPath = 'coupons';
      await updateDoc(doc(db, couponsPath, cp.code), {
        active: !cp.active
      });
      fetchCouponsList();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'coupons');
    }
  };

  // Save Website / Checkout controls configs
  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);

    const updatedConfig: SiteConfig = {
      pixKey: cfgPixKey.trim() || 'dubai@storepix.com.br',
      gateway: cfgGateway,
      instagram: cfgInstagram.trim(),
      whatsapp: cfgWhatsapp.trim(),
      tiktok: cfgTiktok.trim(),
      facebook: cfgFacebook.trim(),
      youtube: cfgYoutube.trim(),
      creditCardEnabled: cfgCreditCard,
      debitCardEnabled: cfgDebitCard,
      pixEnabled: cfgPixEnabled,
      mercadoPagoToken: cfgMercadoPagoToken.trim(),
      mercadoPagoPublicKey: cfgMercadoPagoPublicKey.trim(),
    };

    try {
      const configPath = 'siteConfig';
      await setDoc(doc(db, configPath, 'global'), updatedConfig);
      onRefreshConfig();
      alert('Todas as configurações do site foram salvas na nuvem!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'siteConfig');
    } finally {
      setSavingConfig(false);
    }
  };

  // Block/Unblock customer profiles
  const handleToggleBlockUser = async (profile: UserProfile) => {
    const isCurrentlyBlocked = profile.blocked || false;
    const word = isCurrentlyBlocked ? 'Desbloquear' : 'Bloquear';
    if (!window.confirm(`${word} o acesso deste comprador VIP?`)) return;

    try {
      const profilesPath = 'userProfiles';
      await updateDoc(doc(db, profilesPath, profile.uid), {
        blocked: !isCurrentlyBlocked
      });
      fetchUsersList();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/98 backdrop-blur-md flex flex-col p-4 sm:p-6 overflow-hidden">
      
      {/* Admin Panel Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-[#D4AF37] h-6 w-6" />
          <div>
            <span className="text-[9px] font-sans tracking-[0.25em] text-white/40 uppercase font-bold">SISTEMA INTEGRAL DE CONTRÔLE</span>
            <span className="text-sm font-sans tracking-widest font-bold text-white uppercase block">DUBAI ADMIN PLATFORM</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-white/5 border border-white/5 p-2 text-white/50 hover:text-white transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
        
        {/* Left Administrative Sidebar navigation and indicators */}
        <div className="md:w-60 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible md:space-y-1 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-6 gap-2 min-h-0 scrollbar-none select-none shrink-0">
          {[
            { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
            { id: 'products', name: 'Produtos', icon: Package },
            { id: 'categories', name: 'Categorias', icon: FolderOpen },
            { id: 'orders', name: 'Pedidos faturados', icon: ArrowUpRight },
            { id: 'coupons', name: 'Cupons / Descontos', icon: Percent },
            { id: 'users', name: 'Fidelizados / Clientes', icon: Users },
            { id: 'settings', name: 'Configurações', icon: Settings },
          ].map((nav) => {
            const Icon = nav.icon;
            return (
              <button
                key={nav.id}
                onClick={() => setActiveTab(nav.id as any)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-sm text-xs font-sans font-bold uppercase tracking-widest text-left transition cursor-pointer ${
                  activeTab === nav.id
                    ? 'bg-[#D4AF37] text-black font-extrabold'
                    : 'text-white/40 hover:bg-white/5 w-full hover:text-white'
                }`}
              >
                <Icon size={14} />
                <span className="hidden md:inline">{nav.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Active Workspace panel scrolling */}
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin pr-2 pb-6">
          
          {/* TAB 1: Dashboard metrics */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Metric Card 1 */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Faturamento global</span>
                  <p className="text-2xl font-black text-amber-500 font-sans">
                    R$ {totalFaturado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-zinc-600 font-mono">Pedidos liquidados / faturados</p>
                </div>

                {/* Metric Card 2 */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Fatura de Pedidos</span>
                  <p className="text-2xl font-black text-white font-sans">{totalOrdersCount}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">Faturas totais em base</p>
                </div>

                {/* Metric Card 3 */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Vitrine de Catálogo</span>
                  <p className="text-2xl font-black text-white font-sans">{products.length}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">Artigos cadastrados ativos</p>
                </div>

                {/* Metric Card 4 */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Clube Dubai VIP</span>
                  <p className="text-2xl font-black text-teal-400 font-sans">{usersList.length}</p>
                  <p className="text-[10px] text-zinc-600 font-mono">Fidelizados registrados</p>
                </div>

              </div>

              {/* Live transactions summary log */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-5 space-y-3 mt-8">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest">Ações Operacionais Recentes</span>
                  <button onClick={fetchOrdersList} className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] font-mono">
                    <RefreshCw size={10} /> Sincronizar
                  </button>
                </div>

                <div className="divide-y divide-zinc-900/60 text-xs">
                  {orders.slice(0, 5).map((o) => (
                    <div key={o.id} className="flex justify-between items-center py-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-zinc-300">{o.customerName} faturou {o.items.length} itens</p>
                        <p className="text-[10px] text-zinc-500 font-mono">Cod ref: {o.id} • {o.paymentMethod}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-amber-400 font-bold">R$ {o.total.toLocaleString('pt-BR')}</span>
                        <p className="text-[10px] text-emerald-400 font-mono">Pago</p>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <div className="text-center text-zinc-600 py-6 text-[11px]">Nenhuma transição faturada em base de dados.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Manage products */}
          {activeTab === 'products' && (
            <div className="space-y-6 text-left">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest">Catálogo de Artigos</span>
                <button
                  id="admin-add-product-btn"
                  onClick={handleOpenProductFormForNew}
                  className="flex items-center gap-1 bg-amber-400 hover:bg-amber-300 text-black text-xs font-mono font-bold px-4 py-2.5 rounded-lg transition"
                >
                  <Plus size={14} /> Novo Produto
                </button>
              </div>

              {/* Form to Create/Edit Product */}
              {showProductForm && (
                <form onSubmit={handleSaveProduct} className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-amber-400 font-bold uppercase border-b border-zinc-900 pb-2">
                    {editingProduct ? 'Editar Ficha do Produto' : 'Cadastrar novo lote VIP'}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Código Ref (ID):</label>
                      <input
                        type="text"
                        disabled={!!editingProduct}
                        value={pId}
                        onChange={(e) => setPId(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none focus:border-amber-400 disabled:opacity-55"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Nome do Artigo:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Tênis Jordan Retro Red"
                        value={pName}
                        onChange={(e) => setPName(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Marca / Estilista:</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Balenciaga, Dior, Nike"
                        value={pBrand}
                        onChange={(e) => setPBrand(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Categoria:</label>
                      <select
                        value={pCat}
                        onChange={(e) => setPCat(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Subcategoria:</label>
                      <input
                        type="text"
                        list="subcat-options"
                        value={pSubcat}
                        onChange={(e) => setPSubcat(e.target.value)}
                        placeholder="Selecione ou digite"
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none"
                      />
                      <datalist id="subcat-options">
                        {categories.find(c => c.id === pCat)?.subcategories?.map(sub => (
                          <option key={sub} value={sub} />
                        ))}
                        <option value="Perfumes Árabes" />
                        <option value="Perfumes Importados" />
                        <option value="Camisas de Times" />
                        <option value="Camisas da NBA" />
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Preço Normal (R$):</label>
                      <input
                        type="number"
                        required
                        value={pPrice}
                        onChange={(e) => setPPrice(Number(e.target.value))}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Preço Promocional (R$):</label>
                      <input
                        type="number"
                        value={pPromoPrice}
                        onChange={(e) => setPPromoPrice(Number(e.target.value))}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Estoque (Unidades):</label>
                      <input
                        type="number"
                        required
                        value={pStock}
                        onChange={(e) => setPStock(Number(e.target.value))}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-1">Resumo das Especificações:</label>
                    <textarea
                      value={pDesc}
                      onChange={(e) => setPDesc(e.target.value)}
                      placeholder="Descrição sofisticada do lote..."
                      rows={3}
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 font-bold block mb-2">Imagens do Lote (URLs):</label>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {pImages.map((imgUrl, imageUrlIdx) => (
                          <div key={imageUrlIdx} className="flex gap-2 items-center">
                            <input
                              type="text"
                              required={imageUrlIdx === 0}
                              placeholder={imageUrlIdx === 0 ? "URL da Imagem Principal (Obrigatória)" : `URL da Imagem adicional ${imageUrlIdx + 1}`}
                              value={imgUrl}
                              onChange={(e) => {
                                const updatedImgArray = [...pImages];
                                updatedImgArray[imageUrlIdx] = e.target.value;
                                setPImages(updatedImgArray);
                              }}
                              className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs flex-1 focus:outline-none focus:border-[#D4AF37]"
                            />
                            {pImages.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updatedImgArray = pImages.filter((_, filterIdx) => filterIdx !== imageUrlIdx);
                                  setPImages(updatedImgArray);
                                }}
                                className="p-2.5 text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-md transition text-xs font-bold font-mono"
                              >
                                REMOVER
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPImages([...pImages, ''])}
                        className="mt-2 text-[9px] font-mono tracking-wider font-extrabold text-[#D4AF37] hover:text-white uppercase transition-colors flex items-center gap-1 bg-white/5 px-2.5 py-1.5 rounded-sm hover:bg-white/10"
                      >
                        ✦ Adicionar Nova Imagem
                      </button>
                    </div>

                    <div className="flex gap-6 items-center py-2 bg-zinc-950/20 px-3 rounded-lg border border-zinc-900/40">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pFeatured}
                          onChange={(e) => setPFeatured(e.target.checked)}
                          className="accent-[#D4AF37]"
                        />
                        <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest">Destaque</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={pIsNew}
                          onChange={(e) => setPIsNew(e.target.checked)}
                          className="accent-[#D4AF37]"
                        />
                        <span className="text-[10px] font-mono text-zinc-300 uppercase tracking-widest">Coleção Nova</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block mb-1">Tamanhos disponíveis (Separados por vírgula):</label>
                      <input
                        type="text"
                        placeholder="Ex: P, M, G, GG ou 39, 40, 41"
                        value={pSizes}
                        onChange={(e) => setPSizes(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2 border border-zinc-800 text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block mb-1">Opções de Cores (Separadas por vírgula):</label>
                      <input
                        type="text"
                        placeholder="Ex: Preto Grafite, Azul Real"
                        value={pColors}
                        onChange={(e) => setPColors(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2 border border-zinc-800 text-xs w-full"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => setShowProductForm(false)}
                      className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-mono uppercase"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-2 rounded-lg text-xs font-mono font-bold uppercase transition"
                    >
                      Processar Lote
                    </button>
                  </div>
                </form>
              )}

              {/* Products Directory Grid */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-400 divide-y divide-zinc-900">
                  <thead>
                    <tr className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      <th className="py-3 px-2">Ref</th>
                      <th className="py-3 px-2">Produto</th>
                      <th className="py-3 px-2">Categoria</th>
                      <th className="py-3 px-2">Preço (R$)</th>
                      <th className="py-3 px-2">Estoque</th>
                      <th className="py-3 px-2">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40">
                    {products.map((prod) => (
                      <tr key={prod.id} className="hover:bg-zinc-900/30">
                        <td className="py-3.5 px-2 font-mono text-[10px] text-zinc-500">{prod.id}</td>
                        <td className="py-3.5 px-2 font-semibold text-zinc-200">
                          <div className="flex items-center gap-3">
                            <img src={prod.images?.[0] || undefined} className="h-10 w-8 object-cover rounded" />
                            <div>
                              <p className="truncate max-w-[180px]">{prod.name}</p>
                              <span className="text-[9px] font-mono text-zinc-500">{prod.brand}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-2 font-mono uppercase text-zinc-500">{prod.category}</td>
                        <td className="py-3.5 px-2 font-mono text-amber-500 font-bold">
                          R$ {(prod.promoPrice || prod.price).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-2 font-mono">
                          <span className={prod.stock <= 2 ? 'text-red-400 font-bold' : 'text-zinc-400'}>
                            {prod.stock} un
                          </span>
                        </td>
                        <td className="py-3.5 px-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOpenProductFormForEdit(prod)}
                              className="p-1 px-2 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded hover:text-white"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod.id)}
                              className="p-1 px-2 border border-zinc-800 hover:border-red-900 bg-zinc-900 hover:bg-red-500/10 rounded hover:text-red-400"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: Categories switches */}
          {activeTab === 'categories' && (
            <div className="space-y-6 text-left">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Create Category forms */}
                <form onSubmit={handleSaveCategory} className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">Criar Categoria</div>
                  
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">Código Único (ID / Slug):</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: joias, relogios"
                      value={newCatId}
                      onChange={(e) => setNewCatId(e.target.value)}
                      className="bg-zinc-900 text-white rounded-lg p-2.5 text-xs w-full border border-zinc-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">Nome de Exibição:</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Jóias Importadas"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="bg-zinc-900 text-white rounded-lg p-2.5 text-xs w-full border border-zinc-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">Subcategorias (separadas por vírgula):</label>
                    <input
                      type="text"
                      placeholder="Ex: Perfumes Árabes, Perfumes Importados"
                      value={newCatSubcategories}
                      onChange={(e) => setNewCatSubcategories(e.target.value)}
                      className="bg-zinc-900 text-white rounded-lg p-2.5 text-xs w-full border border-zinc-800 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono font-bold uppercase text-xs py-3 rounded-xl transition"
                  >
                    Cadastrar Categoria
                  </button>
                </form>

                {/* Categories listings block */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">Tópicos Ativos</div>
                  
                  <div className="space-y-4">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex flex-col gap-2.5 rounded-xl bg-zinc-900/50 p-3.5 border border-zinc-900">
                        <div className="flex justify-between items-center">
                          <div className="text-left">
                            <p className="text-xs font-bold text-zinc-200 capitalize">{cat.name}</p>
                            <span className="text-[9px] font-mono text-zinc-500">ID: {cat.id}</span>
                          </div>

                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleToggleCategoryActive(cat)}
                              className={`text-[9px] font-mono font-bold px-3 py-1.5 rounded transition ${
                                cat.active
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}
                            >
                              {cat.active ? 'HABILITADO' : 'DESATIVADO'}
                            </button>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-zinc-900 mt-1 flex flex-col gap-1.5">
                          <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Subcategorias (separadas por vírgula):</span>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Ex: Sub 1, Sub 2, Sub 3"
                              defaultValue={cat.subcategories?.join(', ') || ''}
                              id={`subcats-input-${cat.id}`}
                              className="bg-zinc-950 text-white rounded-lg p-1.5 px-2 text-[11px] w-full border border-zinc-850 focus:outline-[#D4AF37] focus:outline focus:outline-1"
                            />
                            <button
                              onClick={async () => {
                                const val = (document.getElementById(`subcats-input-${cat.id}`) as HTMLInputElement)?.value || '';
                                const subList = val.split(',').map(s => s.trim()).filter(Boolean);
                                try {
                                  await updateDoc(doc(db, 'categories', cat.id), {
                                    subcategories: subList
                                  });
                                  onRefreshCategories();
                                  alert('Subcategorias atualizadas!');
                                } catch (err) {
                                  handleFirestoreError(err, OperationType.UPDATE, 'categories');
                                }
                              }}
                              className="px-2.5 py-1.5 bg-[#D4AF37] hover:bg-[#C5A059] text-black font-semibold text-[10px] rounded cursor-pointer"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: Customer orders list records */}
          {activeTab === 'orders' && (
            <div className="space-y-6 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest">Faturas de Vendas</span>
                <button onClick={fetchOrdersList} className="text-zinc-500 hover:text-white flex items-center gap-1 text-[10px] font-mono">
                  <RefreshCw size={12} /> Atualizar Pedidos
                </button>
              </div>

              <div className="space-y-4">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between pb-3.5 border-b border-zinc-900/60 text-xs gap-2">
                      <div>
                        <p className="font-bold text-zinc-200">Cod Ref Fatura: {o.id}</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">
                          Consumidor: <span className="text-zinc-300">{o.customerName} - {o.customerEmail}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-zinc-400 font-bold block sm:pr-4 sm:border-r border-zinc-900">
                          R$ {o.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        
                        {/* Status switcher action */}
                        <select
                          value={o.status || 'Pendente'}
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          className="bg-zinc-900 text-zinc-300 text-[10px] font-mono font-bold uppercase p-1.5 rounded border border-zinc-800 focus:outline-none"
                        >
                          <option value="Pendente">Pendente</option>
                          <option value="Pago">Pago</option>
                          <option value="Enviado">Enviado</option>
                          <option value="Cancelado">Cancelado</option>
                        </select>
                      </div>
                    </div>

                    {/* Order products sub list */}
                    <div className="space-y-2 divide-y divide-zinc-900/30">
                      {o.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs pt-1.5">
                          <div className="flex gap-2.5 items-center">
                            <img src={it.image || undefined} className="h-9 w-7 object-cover rounded" />
                            <div>
                              <p className="font-semibold text-zinc-300">{it.name}</p>
                              <span className="text-[9px] font-mono text-zinc-500">Tam: {it.size} • Cor: {it.color}</span>
                            </div>
                          </div>
                          <span className="font-mono text-zinc-400">{it.quantity} un x R$ {it.price.toLocaleString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>

                    {/* Ship Address detail review */}
                    <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-900 text-[10px] text-zinc-500 leading-relaxed font-mono">
                      Remeter para: {o.shippingAddress.street}, nº {o.shippingAddress.number} • {o.shippingAddress.neighborhood} • {o.shippingAddress.city} - {o.shippingAddress.state} • CEP: {o.shippingAddress.zipCode}
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <div className="text-center py-8 text-zinc-600 font-mono text-xs">Nenhum pedido recebido e faturado na base de dados.</div>
                )}
              </div>

            </div>
          )}

          {/* TAB 5: Manage coupons and discount voucher systems */}
          {activeTab === 'coupons' && (
            <div className="space-y-6 text-left">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                
                {/* Form to Create Coupon */}
                <form onSubmit={handleSaveCoupon} className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-amber-500 font-bold uppercase tracking-wider">Criar Novo Cupom VIP</div>
                  
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 block mb-1">CÓDIGO (Será convertido a letras maiúsculas):</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: DUBAI50"
                      value={cCode}
                      onChange={(e) => setCCode(e.target.value)}
                      className="bg-zinc-900 text-white rounded-lg p-2.5 text-xs w-full focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block mb-1">Desconto (%):</label>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        required
                        value={cDiscount}
                        onChange={(e) => setCDiscount(Number(e.target.value))}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 text-xs w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-400 block mb-1">Data Validade:</label>
                      <input
                        type="date"
                        required
                        value={cExpiry}
                        onChange={(e) => setCExpiry(e.target.value)}
                        className="bg-zinc-900 text-white rounded-lg p-2.5 text-xs w-full text-center"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-amber-400 hover:bg-amber-300 text-black font-mono font-bold uppercase text-xs py-3.5 rounded-xl transition"
                  >
                    Gerar Cupom
                  </button>
                </form>

                {/* Coupons listing directory */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-zinc-400 font-bold uppercase tracking-wider">Cupons Ativos</div>
                  
                  <div className="space-y-2">
                    {coupons.map((cp) => (
                      <div key={cp.code} className="flex justify-between items-center bg-zinc-900/40 p-3.5 rounded-xl border border-zinc-900">
                        <div className="text-left font-mono">
                          <p className="text-xs font-bold text-teal-400">{cp.code}</p>
                          <p className="text-[9px] text-zinc-500 mt-1">Desconto: {cp.discountPercent}% • Val: {cp.expiryDate}</p>
                        </div>

                        <button
                          onClick={() => handleToggleCouponActive(cp)}
                          className={`text-[9px] font-mono font-bold px-2.5 py-1.5 rounded ${
                            cp.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                          }`}
                        >
                          {cp.active ? 'ATIVO' : 'DESACTIVADO'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 6: Registered Buyer directory */}
          {activeTab === 'users' && (
            <div className="space-y-6 text-left">
              <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest">Registros de Compradores VIP</span>
              
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4">
                <div className="divide-y divide-zinc-900">
                  {usersList.map((usr) => (
                    <div key={usr.uid} className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-3 text-xs text-zinc-400">
                      <div className="text-left">
                        <p className="font-bold text-zinc-200">{usr.name || 'Sem Nome'}</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">{usr.email} • Tel: {usr.phone || 'Nenhum'}</p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleBlockUser(usr)}
                          className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded transition ${
                            usr.blocked
                              ? 'bg-red-500 text-white'
                              : 'border border-zinc-800 hover:border-red-900 hover:bg-red-500/10 hover:text-red-400'
                          }`}
                        >
                          {usr.blocked ? 'BLOQUEADO' : 'SUSPENDER CLIENTE'}
                        </button>
                      </div>
                    </div>
                  ))}

                  {usersList.length === 0 && (
                    <div className="text-center py-8 text-zinc-600 font-mono text-xs">Aguardando novos cadastros.</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Site Config page (Social links, PIX, Gateways switches) */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveConfigs} className="space-y-6 text-left">
              <span className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest block mb-4">Master Config de Checkout e MeiosSociais</span>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Gateway settings column */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">Checkout & Gateway de Liquidação</div>
                  
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">Chave Destinatária PIX (Recebimentos):</label>
                    <input
                      type="text"
                      value={cfgPixKey}
                      onChange={(e) => setCfgPixKey(e.target.value)}
                      placeholder="Como telefone, e-mail, etc."
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">Operador Gateway Adquirente Principal:</label>
                    <select
                      value={cfgGateway}
                      onChange={(e) => setCfgGateway(e.target.value as any)}
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none focus:border-amber-400"
                    >
                      <option value="Stripe">Stripe Gateway • VIP API</option>
                      <option value="Mercado Pago">Mercado Pago • Checkout Pro</option>
                      <option value="PagSeguro">PagSeguro UOL • Transações</option>
                    </select>
                  </div>

                  {cfgGateway === 'Mercado Pago' && (
                    <div className="space-y-3 bg-zinc-900/45 p-3.5 rounded-xl border border-[#D4AF37]/20">
                      <div className="text-[10px] font-mono font-bold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Credenciais Mercado Pago Oficial
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-zinc-500 block mb-1">Public Key (Chave Pública):</label>
                        <input
                          type="text"
                          value={cfgMercadoPagoPublicKey}
                          onChange={(e) => setCfgMercadoPagoPublicKey(e.target.value)}
                          placeholder="Ex: APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-mono text-zinc-500 block mb-1">Access Token (Token de Acesso):</label>
                        <input
                          type="password"
                          value={cfgMercadoPagoToken}
                          onChange={(e) => setCfgMercadoPagoToken(e.target.value)}
                          placeholder="Ex: APP_USR-xxxxxxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxxxxxxxxxx"
                          className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment option master switches */}
                  <div className="space-y-2 bg-zinc-900/30 p-3 rounded-xl border border-zinc-900">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase font-black block mb-2">Instrumentos Habilitados:</span>
                    
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                      <input type="checkbox" checked={cfgPixEnabled} onChange={(e) => setCfgPixEnabled(e.target.checked)} />
                      <span>Transações de PIX instantâneo</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                      <input type="checkbox" checked={cfgCreditCard} onChange={(e) => setCfgCreditCard(e.target.checked)} />
                      <span>Faturamento em Cartão de Crédito</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                      <input type="checkbox" checked={cfgDebitCard} onChange={(e) => setCfgDebitCard(e.target.checked)} />
                      <span>Faturamento de Cartão de Débito</span>
                    </label>
                  </div>
                </div>

                {/* Social links column */}
                <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-5 space-y-4">
                  <div className="text-xs font-mono text-teal-400 font-bold uppercase tracking-wider">Redes de Engajamento Social</div>
                  
                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">LINK WHATSAPP DIRECT:</label>
                    <input
                      type="text"
                      value={cfgWhatsapp}
                      onChange={(e) => setCfgWhatsapp(e.target.value)}
                      placeholder="https://wa.me/..."
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">INSTAGRAM CHANNEL:</label>
                    <input
                      type="text"
                      value={cfgInstagram}
                      onChange={(e) => setCfgInstagram(e.target.value)}
                      placeholder="https://instagram.com/..."
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">TIKTOK HANDLE LINK:</label>
                    <input
                      type="text"
                      value={cfgTiktok}
                      onChange={(e) => setCfgTiktok(e.target.value)}
                      placeholder="https://tiktok.com/..."
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">FACEBOOK PAGE:</label>
                    <input
                      type="text"
                      value={cfgFacebook}
                      onChange={(e) => setCfgFacebook(e.target.value)}
                      placeholder="https://facebook.com/..."
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-500 block mb-1">YOUTUBE DEPOSIT:</label>
                    <input
                      type="text"
                      value={cfgYoutube}
                      onChange={(e) => setCfgYoutube(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className="bg-zinc-900 text-white rounded-lg p-2.5 border border-zinc-800 text-xs w-full"
                    />
                  </div>
                </div>

              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end">
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-semibold font-mono text-xs uppercase px-8 py-3.5 rounded-xl transition"
                >
                  {savingConfig ? 'Gravando Alterações...' : 'Salvar no Banco Cloud'}
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}
