import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LogIn, UserPlus, Heart, MapPin, Package, LogOut, Shield, Compass, KeyRound, Save, PlusCircle, Trash, Star, X } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { UserProfile, Order, OrderAddress } from '../types';

interface UserAccountProps {
  user: any; // Firebase user
  userProfile: UserProfile | null;
  onClose: () => void;
  onRefreshProfile: () => void;
  isAdminUser: boolean;
  onOpenAdmin: () => void;
}

export default function UserAccount({
  user,
  userProfile,
  onClose,
  onRefreshProfile,
  isAdminUser,
  onOpenAdmin,
}: UserAccountProps) {
  // Toggle Auth views: 'login' | 'register' | 'forgot'
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Auth Form Controls
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Profile Edit Controls
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  // Address add controls
  const [newAddr, setNewAddr] = useState<OrderAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [showAddAddr, setShowAddAddr] = useState(false);

  // User Orders list record
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Tab Navigation inside account
  const [innerTab, setInnerTab] = useState<'profile' | 'orders' | 'addresses'>('profile');

  useEffect(() => {
    if (user) {
      setEditName(userProfile?.name || user.displayName || '');
      setEditPhone(userProfile?.phone || '');
      fetchUserOrders(user.uid);
    }
  }, [user, userProfile]);

  const fetchUserOrders = async (uid: string) => {
    setOrdersLoading(true);
    try {
      const q = query(
        collection(db, 'orders'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const orders: Order[] = [];
      snapshot.forEach((doc) => {
        orders.push(doc.data() as Order);
      });
      setUserOrders(orders);
    } catch (e) {
      console.error('Failed to get customer orders ', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setAuthLoading(true);

    try {
      if (authView === 'login') {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        setAuthSuccess('Bem-vindo de volta!');
        onRefreshProfile();
        setTimeout(() => onClose(), 1000);
      } else if (authView === 'register') {
        if (!displayName.trim()) {
          setAuthError('Digite o seu nome completo para registro.');
          setAuthLoading(false);
          return;
        }
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName });
        
        // Write standard User Profile document
        const profilesPath = 'userProfiles';
        const profileRef = doc(db, profilesPath, credential.user.uid);
        const profileData: UserProfile = {
          uid: credential.user.uid,
          email: credential.user.email || email,
          name: displayName,
          phone: phone,
          blocked: false,
          addresses: [],
          favorites: [],
          createdAt: new Date().toISOString(),
        };
        await setDoc(profileRef, profileData);
        
        setAuthSuccess('Conta VIP criada com sucesso!');
        onRefreshProfile();
        setTimeout(() => onClose(), 1200);
      } else if (authView === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        setAuthSuccess('Link de restauração enviado ao seu e-mail.');
      }
    } catch (err: any) {
      console.error('Authentication process failure: ', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setAuthError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('Este e-mail já está em uso na Dubai Store.');
      } else if (err.code === 'auth/invalid-email') {
        setAuthError('Digite um endereço de e-mail válido.');
      } else if (err.code === 'auth/unknown-error' || err.message.includes('the client is offline')) {
        setAuthError('Por favor, ative a autenticação por e-mail no console Firebase.');
      } else {
        setAuthError(err.message || 'Falha na autenticação.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      await updateProfile(user, { displayName: editName });
      const profilesPath = 'userProfiles';
      await updateDoc(doc(db, profilesPath, user.uid), {
        name: editName,
        phone: editPhone,
      });
      onRefreshProfile();
      alert('Perfil VIP atualizado!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newAddr.street || !newAddr.number || !newAddr.city || !newAddr.state || !newAddr.zipCode) {
      alert('Preencha os campos obrigatórios do endereço.');
      return;
    }

    try {
      const currentAddrs = userProfile?.addresses || [];
      const updatedAddrs = [...currentAddrs, newAddr];
      
      const profilesPath = 'userProfiles';
      await updateDoc(doc(db, profilesPath, user.uid), {
        addresses: updatedAddrs,
      });
      
      setNewAddr({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zipCode: '',
      });
      setShowAddAddr(false);
      onRefreshProfile();
      alert('Endereço VIP cadastrado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  const handleDeleteAddress = async (idxToDelete: number) => {
    if (!user || !userProfile) return;
    if (!window.confirm('Excluir este endereço de entrega?')) return;

    try {
      const nextAddrs = userProfile.addresses.filter((_, idx) => idx !== idxToDelete);
      const profilesPath = 'userProfiles';
      await updateDoc(doc(db, profilesPath, user.uid), {
        addresses: nextAddrs,
      });
      onRefreshProfile();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onRefreshProfile();
      onClose();
    } catch (e) {
      console.error('Signout failed: ', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl rounded-sm border border-white/10 bg-[#0A0A0A] p-6 sm:p-8 overflow-hidden flex flex-col max-h-[90vh] shadow-2xl"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-white/5 p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* LOGGED OUT: Authentications Screens */}
        {!user ? (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <span className="text-[10px] font-sans tracking-[0.2em] text-[#D4AF37] uppercase font-bold">✦ CONEXÃO VIP EXCLUSIVA ✦</span>
              <h3 className="text-xl font-light text-white font-serif tracking-wide mt-2">
                {authView === 'login' ? 'Conecte-se ao Império' : authView === 'register' ? 'Crie Sua Conta VIP' : 'Restauração de Acesso'}
              </h3>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authView === 'register' && (
                <div className="space-y-1 text-left col-span-1">
                  <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Nome Completo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome completo"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">E-mail Cadastrado:</label>
                <input
                  type="email"
                  required
                  placeholder="Ex: gabriel@dubai.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {authView !== 'forgot' && (
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Senha Segura:</label>
                  <input
                    type="password"
                    required
                    placeholder="Mínimo de 6 parcelas"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}

              {authView === 'register' && (
                <div className="space-y-1 text-left">
                  <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Telefone de Contato (WhatsApp):</label>
                  <input
                    type="tel"
                    placeholder="Ex: (11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              )}

              {authError && <p className="text-xs text-red-400 font-mono mt-2 text-left">{authError}</p>}
              {authSuccess && <p className="text-xs text-emerald-400 font-mono mt-2 text-left">{authSuccess}</p>}

              <button
                id="auth-submit-btn"
                type="submit"
                disabled={authLoading}
                className="w-full rounded-sm bg-[#D4AF37] hover:bg-white py-4 mt-2 text-xs font-sans font-bold uppercase tracking-[0.2em] text-black transition shadow-lg shadow-[#D4AF37]/10 cursor-pointer"
              >
                {authLoading ? 'Verificando Chaves VIP...' : authView === 'login' ? 'Entrar na Loja' : authView === 'register' ? 'Registrar Agora' : 'Solicitar Link'}
              </button>
            </form>

            {/* Auth views swap trigger */}
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-3 border-t border-white/5">
              {authView === 'login' ? (
                <>
                  <button onClick={() => setAuthView('register')} className="hover:text-[#D4AF37] cursor-pointer">Criar uma conta VIP</button>
                  <button onClick={() => setAuthView('forgot')} className="hover:text-[#D4AF37] cursor-pointer">Esqueceu a senha?</button>
                </>
              ) : (
                <button onClick={() => setAuthView('login')} className="hover:text-[#D4AF37] mx-auto w-full text-center cursor-pointer">Já possui conta? Fazer Login</button>
              )}
            </div>

          </div>
        ) : (
          /* LOGGED IN: Authenticated customer panel dashboard */
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-teal-400 to-amber-400 flex items-center justify-center text-black font-black font-sans uppercase">
                {userProfile?.name?.charAt(0) || user.displayName?.charAt(0) || 'U'}
              </div>
              <div>
                <h3 className="text-zinc-200 font-bold">{userProfile?.name || user.displayName || 'Cliente VIP'}</h3>
                <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{user.email}</p>
              </div>
            </div>

            {/* Inner Dashboard Navigation tab bar */}
            <div className="flex gap-4 border-b border-white/5 mb-6">
              {[
                { id: 'profile', name: 'Meu Perfil' },
                { id: 'orders', name: 'Pedidos faturados' },
                { id: 'addresses', name: 'Livro de Endereços' },
              ].map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => setInnerTab(tb.id as any)}
                  className={`text-xs font-sans tracking-wide pb-3 font-semibold relative transition cursor-pointer ${
                    innerTab === tb.id ? 'text-[#D4AF37]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  {tb.name}
                  {innerTab === tb.id && (
                    <motion.div layoutId="innerAccountTab" className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D4AF37]" />
                  )}
                </button>
              ))}
            </div>

            {/* Account Tab views box scrolling */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin pr-1 pb-4">
              
              {/* Profile Details tab */}
              {innerTab === 'profile' && (
                <div className="space-y-4 text-left font-sans">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-3">
                    <div>
                      <label className="text-[9px] font-sans text-white/40 font-bold uppercase tracking-wider block mb-1">Nome Completo:</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-sans text-white/40 font-bold uppercase tracking-wider block mb-1">Telefone / WhatsApp:</label>
                      <input
                        type="tel"
                        value={editPhone}
                        placeholder="(11) 99999-9999"
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                    className="flex items-center gap-1.5 rounded-sm bg-white/5 hover:bg-white/10 text-white border border-white/5 px-4.5 py-3 text-xs font-sans tracking-widest font-bold uppercase cursor-pointer transition-colors"
                  >
                    <Save size={12} className="text-[#D4AF37]" />
                    {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>

                  <div className="border border-white/5 pt-6 mt-6 flex justify-between items-center bg-white/[0.01] p-4 rounded-sm">
                    <div className="text-left font-sans">
                      <h4 className="text-xs font-bold text-[#D4AF37] flex items-center gap-1.5 uppercase tracking-wide">
                        <Star size={12} className="fill-[#D4AF37] text-[#D4AF37]" />
                        Acreditação de Membro VIP
                      </h4>
                      <p className="text-[10px] text-zinc-500 mt-1.5 font-serif max-w-sm">Sua conta desfruta de despacho exclusivo expresso e descontos progressivos automáticos.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-sans font-bold tracking-wider text-[#D4AF37] bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-sm px-3 py-1.5 uppercase">Grau Platinum</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Histories View */}
              {innerTab === 'orders' && (
                <div className="space-y-4">
                  {ordersLoading ? (
                    <div className="text-center text-xs text-zinc-500 font-mono">Consultando base de dados...</div>
                  ) : userOrders.length === 0 ? (
                    <div className="text-center text-xs text-zinc-600 space-y-2 py-4 flex flex-col items-center">
                      <Package size={24} className="stroke-[1.5]" />
                      <span>Nenhum pedido faturado para este perfil.</span>
                    </div>
                  ) : (
                    userOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-zinc-900 bg-zinc-950/80 p-4 text-left space-y-3">
                        <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-900/50">
                          <span className="font-mono text-zinc-400">ID: {order.id}</span>
                          <span className={`px-2.5 py-1 rounded text-[10px] font-mono uppercase font-bold ${
                            order.status === 'Pago' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15' : 
                            order.status === 'Enviado' ? 'text-blue-400 bg-blue-500/10 border border-blue-500/15' : 'text-zinc-400 bg-zinc-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Order items inside order history */}
                        <div className="divide-y divide-zinc-900/40">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex gap-2.5 py-2 items-center text-xs">
                              <img src={it.image || undefined} alt="" className="h-10 w-8 object-cover rounded" />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] text-zinc-300 truncate font-semibold">{it.name}</h4>
                                <p className="text-[9px] font-mono text-zinc-500">Tamanho: {it.size} • Cor: {it.color}</p>
                              </div>
                              <span className="font-mono text-zinc-300">{it.quantity}x R$ {it.price.toLocaleString('pt-BR')}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 text-xs border-t border-white/5 font-sans uppercase font-bold text-zinc-500">
                          <span className="text-[9px]">MÉTODO: {order.paymentMethod}</span>
                          <span className="text-[#D4AF37] text-sm">TOTAL: R$ {order.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
                          {/* User Addresses Panel */}
              {innerTab === 'addresses' && (
                <div className="space-y-4 text-left font-sans">
                  
                  {/* List Addresses */}
                  <div className="space-y-3">
                    {(!userProfile?.addresses || userProfile.addresses.length === 0) ? (
                      <div className="text-[11px] text-zinc-650 text-center py-4 flex flex-col items-center gap-1.5 font-bold uppercase tracking-wider">
                        <MapPin size={20} className="stroke-[1.5] text-[#D4AF37]" />
                        <span>Nenhum endereço cadastrado para remessa expressa.</span>
                      </div>
                    ) : (
                      userProfile.addresses.map((addr, idx) => (
                        <div key={idx} className="flex items-start justify-between rounded-sm border border-white/5 bg-white/[0.01] p-3">
                          <div className="text-xs text-zinc-400 space-y-1">
                            <p className="font-bold text-zinc-200">{addr.street}, nº {addr.number}</p>
                            {addr.complement && <p>Comp: {addr.complement}</p>}
                            <p>{addr.neighborhood} • {addr.city} - {addr.state}</p>
                            <p className="font-mono text-[10px]">CEP: {addr.zipCode}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteAddress(idx)}
                            className="text-zinc-500 hover:text-red-400 p-1 cursor-pointer"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add address interface forms toggles */}
                  {!showAddAddr ? (
                    <button
                      onClick={() => setShowAddAddr(true)}
                      className="flex items-center gap-1.5 rounded-sm border border-white/5 bg-white/5 hover:bg-white/10 text-white px-4.5 py-3 text-xs font-sans tracking-widest font-bold uppercase transition cursor-pointer"
                    >
                      <PlusCircle size={14} className="text-[#D4AF37]" />
                      Adicionar Novo Endereço
                    </button>
                  ) : (
                    <form onSubmit={handleAddAddress} className="rounded-sm border border-white/5 bg-white/[0.01] p-4 space-y-3.5">
                      <div className="text-[10px] font-sans text-[#D4AF37] uppercase font-bold tracking-[0.15em] mb-1">Novo Endereço de Rastreio</div>
                      
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Rua / Logradouro *"
                            required
                            value={newAddr.street}
                            onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                            className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Número *"
                            required
                            value={newAddr.number}
                            onChange={(e) => setNewAddr({ ...newAddr, number: e.target.value })}
                            className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Bairro *"
                          required
                          value={newAddr.neighborhood}
                          onChange={(e) => setNewAddr({ ...newAddr, neighborhood: e.target.value })}
                          className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                        />
                        <input
                          type="text"
                          placeholder="Complemento"
                          value={newAddr.complement}
                          onChange={(e) => setNewAddr({ ...newAddr, complement: e.target.value })}
                          className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <input
                            type="text"
                            placeholder="Cidade *"
                            required
                            value={newAddr.city}
                            onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                            className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="UF *"
                            maxLength={2}
                            required
                            value={newAddr.state}
                            onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value.toUpperCase() })}
                            className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-full text-center"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="CEP (Ex: 01311-200) *"
                          required
                          value={newAddr.zipCode}
                          onChange={(e) => setNewAddr({ ...newAddr, zipCode: e.target.value })}
                          className="bg-white/5 text-white text-xs rounded-sm p-3 border border-white/5 focus:outline-none focus:border-[#D4AF37] w-1/2"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setShowAddAddr(false)}
                          className="px-3 py-2 text-white/40 hover:text-white uppercase font-bold tracking-wider cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="bg-[#D4AF37] hover:bg-white text-black px-5 py-2.5 rounded-sm font-sans font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Cadastrar
                        </button>
                      </div>

                    </form>
                  )}

                </div>
              )}

            </div>

            {/* Logout drawer segment bottom footer actions for account panel */}
            <div className="border-t border-white/5 pt-5 mt-4 flex items-center justify-between">
              <button
                id="account-logout-btn"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-red-400 text-xs font-sans font-bold uppercase tracking-widest transition cursor-pointer"
              >
                <LogOut size={14} />
                Encerrar/Sessão-VIP
              </button>

              {isAdminUser && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAdmin();
                  }}
                  className="flex items-center gap-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/25 text-[#D4AF37] font-sans text-[9px] uppercase tracking-[0.15em] px-3.5 py-2 rounded-sm border border-[#D4AF37]/20 transition cursor-pointer duration-300"
                >
                  <Shield size={12} />
                  PAINEL DE CONTROLE ADMIN
                </button>
              )}
            </div>
          </div>
        )}

      </motion.div>
    </div>
  );
}
