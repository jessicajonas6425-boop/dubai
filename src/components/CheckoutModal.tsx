import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, QrCode, Clipboard, MapPin, Tag, CheckCircle, Flame, Smartphone, ArrowRight } from 'lucide-react';
import { CartItem, Order, OrderAddress, Coupon, Product, SiteConfig } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { writeBatch, doc, getDoc, collection, getDocs, addDoc } from 'firebase/firestore';

interface CheckoutModalProps {
  cart: CartItem[];
  onClose: () => void;
  onClearCart: () => void;
  user: any; // Firebase user
  siteConfig: SiteConfig;
}

export default function CheckoutModal({
  cart,
  onClose,
  onClearCart,
  user,
  siteConfig,
}: CheckoutModalProps) {
  const [step, setStep] = useState<1 | 2>(1); // 1: Delivery Address & Coupon, 2: Receipt/WhatsApp Dispatch

  // Address State
  const [address, setAddress] = useState<OrderAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
  });

  // Client Metadata info
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');

  // Coupon State
  const [couponCode, setCouponCode] = useState<string>('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string>('');
  const [couponLoading, setCouponLoading] = useState<boolean>(false);

  // Transaction Receipt details
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [isProcessingOrder, setIsProcessingOrder] = useState<boolean>(false);

  // Dynamic Shipping & Zip Code Lookup
  const [shippingPrice, setShippingPrice] = useState<number | null>(null);
  const [shippingCarrier, setShippingCarrier] = useState<string>('');
  const [isCepLoading, setIsCepLoading] = useState<boolean>(false);

  // Total Calculations
  const rawSubtotal = cart.reduce((acc, curr) => {
    const price = curr.product.promoPrice || curr.product.price;
    return acc + price * curr.quantity;
  }, 0);

  const discountAmount = appliedCoupon ? (rawSubtotal * appliedCoupon.discountPercent) / 100 : 0;
  const currentShipping = shippingPrice !== null ? shippingPrice : 0;
  const grandTotal = Math.max(0, rawSubtotal - discountAmount + currentShipping);

  const handleCepLookup = async (cepCode: string) => {
    const cleaned = cepCode.replace(/\D/g, '');
    if (cleaned.length !== 8) return;

    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
      const data = await response.json();
      if (data && !data.erro) {
        setAddress(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          zipCode: cepCode,
        }));

        // Calculate automatic shipping based on destination State / Region of Brazil
        const uf = (data.uf || 'SP').toUpperCase();
        let price = 15.00;
        let carrier = 'SEDEX VIP';
        let days = '2 a 3 dias úteis';

        if (uf === 'SP') {
          price = 14.90;
          carrier = 'Expressa Entrega VIP';
          days = '1 a 2 dias úteis';
        } else if (['RJ', 'MG', 'ES'].includes(uf)) {
          price = 22.80;
          carrier = 'SEDEX Gold';
          days = '2 a 4 dias úteis';
        } else if (['PR', 'SC', 'RS'].includes(uf)) {
          price = 28.50;
          carrier = 'SEDEX Gold';
          days = '3 a 5 dias úteis';
        } else if (['DF', 'GO', 'MS', 'MT'].includes(uf)) {
          price = 34.90;
          carrier = 'PAC Premium';
          days = '4 a 6 dias úteis';
        } else if (['AM', 'PA', 'AP', 'TO', 'MA', 'PI', 'CE', 'RN', 'PB', 'PE', 'AL', 'SE', 'BA', 'RO', 'AC', 'RR'].includes(uf)) {
          price = 45.00;
          carrier = 'PAC Express';
          days = '5 a 8 dias úteis';
        }

        setShippingPrice(price);
        setShippingCarrier(`${carrier} • ${days}`);
      } else {
        console.warn('CEP não encontrado ou inválido.');
      }
    } catch (err) {
      console.error('Erro ao buscar dados do CEP: ', err);
    } finally {
      setIsCepLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setCustomerName(user.displayName || '');
      setCustomerEmail(user.email || '');
      // Try fetching existing profile info to preload address
      const fetchProfileAddress = async () => {
        try {
          const profileDoc = await getDoc(doc(db, 'userProfiles', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            if (data.addresses && data.addresses.length > 0) {
              const userAddr = data.addresses[0];
              setAddress(userAddr);
              if (userAddr.zipCode) {
                handleCepLookup(userAddr.zipCode);
              }
            }
          }
        } catch (e) {
          console.error('Failed to load profile address ', e);
        }
      };
      fetchProfileAddress();
    }
  }, [user]);

  // Query and Validate coupon from Firestore
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError('');
    setCouponLoading(true);

    try {
      const docRef = doc(db, 'coupons', couponCode.toUpperCase().trim());
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as Coupon;
        const now = new Date();
        const expiry = new Date(data.expiryDate);

        if (data.active && expiry >= now) {
          setAppliedCoupon(data);
          setCouponError('');
        } else {
          setCouponError('Cupom inativo ou expirado.');
          setAppliedCoupon(null);
        }
      } else {
        setCouponError('Cupom inválido ou inexistente.');
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error('Error validation coupon: ', err);
      setCouponError('Falha ao validar cupom.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleApplyQuickCoupon = (code: string) => {
    setCouponCode(code);
    const mockFakeSubmit = { preventDefault: () => {} };
    // Wait for state to catch up
    setTimeout(() => {
      const btn = document.getElementById('apply-coupon-submit-btn');
      if (btn) btn.click();
    }, 100);
  };

  // Process core Order validation, insert document and trigger WhatsApp
  const handleCompleteOrder = async () => {
    // Address validation guard
    if (!address.street || !address.number || !address.city || !address.state || !address.zipCode) {
      alert('Por favor, preencha todos os campos obrigatórios do endereço.');
      setStep(1);
      return;
    }

    setIsProcessingOrder(true);
    const orderId = 'DBI-' + Math.floor(100000 + Math.random() * 900000);

    const newOrder: Order = {
      id: orderId,
      userId: user?.uid || 'GUEST',
      customerName: customerName || 'Cliente Balcão',
      customerEmail: customerEmail || 'guest@dubaistore.com',
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.promoPrice || item.product.price,
        image: item.product.images[0],
        size: item.selectedSize,
        color: item.selectedColor,
        quantity: item.quantity,
      })),
      total: grandTotal,
      status: 'Pendente',
      paymentMethod: 'WhatsApp',
      shippingAddress: address,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batch = writeBatch(db);

    try {
      // 1. Deduct stock elements and commit together in transaction batch
      for (const item of cart) {
        const prodDocRef = doc(db, 'products', item.product.id);
        const prodSnapshot = await getDoc(prodDocRef);
        if (prodSnapshot.exists()) {
          const currentStock = prodSnapshot.data().stock || 0;
          const nextStock = Math.max(0, currentStock - item.quantity);
          batch.update(prodDocRef, { stock: nextStock });
        }
      }

      // 2. Write Order Record
      const ordersPath = 'orders';
      const orderRef = doc(db, ordersPath, orderId);
      batch.set(orderRef, newOrder);

      // Submit batch atomic operations
      await batch.commit();

      // Clear formatting of whatsapp number
      const cleanPhone = (siteConfig.whatsapp || '')
        .replace('https://wa.me/', '')
        .replace('https://api.whatsapp.com/send?phone=', '')
        .replace(/\D/g, '') || '5521985242409';

      // Construct magnificent premium WhatsApp summary text
      let msgs = `👑 *DUBAI LUXURY STORE* 👑\n`;
      msgs += `*✦ NOVO PEDIDO RECEBIDO ✦*\n\n`;
      msgs += `📦 *Pedido ID:* \`${orderId}\`\n`;
      msgs += `📅 *Data:* ${new Date().toLocaleDateString('pt-BR')}\n\n`;
      
      msgs += `👤 *DADOS DO CLIENTE:*\n`;
      msgs += `• *Nome:* ${customerName || 'Cliente Balcão'}\n`;
      msgs += `• *E-mail:* ${customerEmail || 'guest@dubaistore.com'}\n\n`;
      
      msgs += `📍 *ENDEREÇO DE ENTREGA:*\n`;
      msgs += `• *CEP:* ${address.zipCode}\n`;
      msgs += `• *Rua:* ${address.street}, Nº ${address.number}\n`;
      if (address.complement) msgs += `• *Comp.:* ${address.complement}\n`;
      msgs += `• *Bairro:* ${address.neighborhood}\n`;
      msgs += `• *Cidade/UF:* ${address.city} - ${address.state}\n\n`;
      
      msgs += `💼 *ENVIO:*\n`;
      msgs += `• *Frete:* R$ ${(shippingPrice !== null ? shippingPrice : 0).toFixed(2)} (${shippingCarrier})\n\n`;

      msgs += `🛒 *ITENS DO PEDIDO:*\n`;
      cart.forEach((item, index) => {
        const price = item.product.promoPrice || item.product.price;
        msgs += `\n*${index + 1}. ${item.product.name}*\n`;
        msgs += `  • Tam: \`${item.selectedSize}\` | Cor: \`${item.selectedColor}\`\n`;
        msgs += `  • Qtd: ${item.quantity}x R$ ${price.toFixed(2)}\n`;
        msgs += `  • Foto do Item: ${item.product.images[0]}\n`;
      });
      
      msgs += `\n📊 *FINANCEIRO:*\n`;
      msgs += `• *Subtotal:* R$ ${rawSubtotal.toFixed(2)}\n`;
      if (appliedCoupon) {
        msgs += `• *Cupom:* ${appliedCoupon.code} (-${appliedCoupon.discountPercent}%)\n`;
      }
      msgs += `🔥 *TOTAL GERAL:* R$ ${grandTotal.toFixed(2)}\n\n`;
      msgs += `✦ _Pedido aguardando confirmação de pagamento via WhatsApp._ ✦`;

      const waUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(msgs)}`;

      setCreatedOrder(newOrder);
      setStep(2);
      onClearCart();

      // Open WhatsApp Dispatch link
      const link = document.createElement('a');
      link.href = waUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.click();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleCopyPix = () => {
    if (createdOrder?.paymentDetails?.pixCopyPaste) {
      navigator.clipboard.writeText(createdOrder.paymentDetails.pixCopyPaste);
      alert('Código PIX Copia e Cola copiado com sucesso!');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl rounded-sm border border-white/10 bg-[#0A0A0A] p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-thin"
      >
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <h2 className="text-[13px] font-bold tracking-[0.2em] text-white font-sans uppercase">
              {step === 1 ? 'Endereço & Cupom' : 'Finalizando Pedido'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-white/5 p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT FORM AREAS (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1 Form: Address and email collection */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-[10px] font-sans text-white/40 font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#D4AF37]" />
                  Dados do Comprador & Local de Entrega
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Nome Completo:</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex: Gabriel M."
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">E-mail para Acompanhar:</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="Ex: gabriel@dubaistore.com"
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Rua / Logradouro:</label>
                    <input
                      type="text"
                      value={address.street}
                      onChange={(e) => setAddress({ ...address, street: e.target.value })}
                      placeholder="Ex: Av. Paulista"
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Número:</label>
                    <input
                      type="text"
                      value={address.number}
                      onChange={(e) => setAddress({ ...address, number: e.target.value })}
                      placeholder="Ex: 1500"
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Bairro:</label>
                    <input
                      type="text"
                      value={address.neighborhood}
                      onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                      placeholder="Ex: Bela Vista"
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Complemento:</label>
                    <input
                      type="text"
                      value={address.complement}
                      onChange={(e) => setAddress({ ...address, complement: e.target.value })}
                      placeholder="Ap, Bloco, etc."
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Cidade:</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress({ ...address, city: e.target.value })}
                      placeholder="Ex: São Paulo"
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">Estado (UF):</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={address.state}
                      onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                      placeholder="SP"
                      required
                      className="w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none text-center focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[9px] font-sans text-white/50 font-bold uppercase tracking-wider mb-1 block">CEP / Código Postal:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={address.zipCode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAddress({ ...address, zipCode: val });
                        if (val.replace(/\D/g, '').length === 8) {
                          handleCepLookup(val);
                        }
                      }}
                      placeholder="01311-200"
                      required
                      className="w-72 max-w-full bg-white/5 text-white rounded-sm p-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37]"
                    />
                    {isCepLoading && (
                      <span className="text-[10px] text-[#D4AF37] font-sans animate-pulse font-bold uppercase tracking-wider">
                        Buscando endereço...
                      </span>
                    )}
                  </div>
                  {shippingPrice !== null && (
                    <div className="mt-2 text-[10px] text-emerald-400 font-sans font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Frete Calculado: R$ {shippingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ({shippingCarrier})
                    </div>
                  )}
                </div>

                {/* Voucher Coupons input */}
                <div className="border-t border-white/5 pt-5 mt-6">
                  <label className="text-[9px] font-sans text-white/40 font-bold uppercase tracking-[0.2em] mb-2 block">Possui Cupom de Desconto?</label>
                  <form onSubmit={handleApplyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Inserir Cupom VIP (Ex: DUBAI10)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="bg-white/5 text-white rounded-sm px-4 py-3 text-xs border border-white/5 focus:outline-none focus:border-[#D4AF37] uppercase flex-1 max-w-sm"
                    />
                    <button
                      id="apply-coupon-submit-btn"
                      type="submit"
                      disabled={couponLoading}
                      className="bg-[#D4AF37] hover:bg-white text-black px-5 py-3 rounded-sm text-xs font-sans font-bold uppercase tracking-wider transition cursor-pointer"
                    >
                      {couponLoading ? '...' : 'Aplicar'}
                    </button>
                  </form>
                  {couponError && <p className="text-[10px] text-red-400 font-mono mt-2">{couponError}</p>}
                  {appliedCoupon && (
                    <p className="text-[10px] text-emerald-400 font-semibold font-mono mt-2 flex items-center gap-1 animate-pulse">
                      ✓ CUPOM APLICADO: {appliedCoupon.code} - {appliedCoupon.discountPercent}% DE DESCONTO VIP CONCEDIDO!
                    </p>
                  )}
                </div>

              </div>
            )}

            {/* Step 2 Screen: Order Complete screen */}
            {step === 2 && createdOrder && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 py-6">
                <motion.div
                  initial={{ scale: 0.8, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <CheckCircle size={56} className="text-emerald-400 stroke-[1.5]" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider font-display">Pedido Recebido!</h3>
                  <p className="text-xs text-zinc-400 max-w-sm font-serif">
                    Seu pedido foi registrado. Estamos preparando seu resumo e abrindo o WhatsApp da Dubai Store para finalizar.
                  </p>
                </div>

                <div className="text-[11px] font-mono text-white/50 bg-white/5 px-5 py-2.5 rounded-sm border border-white/5 flex items-center gap-1.5 tracking-wider">
                  PEDIDO-REF: <span className="text-[#D4AF37] font-black">{createdOrder.id}</span>
                </div>

                <div className="w-full pt-4">
                  <button
                    onClick={onClose}
                    className="w-64 max-w-full rounded-sm bg-[#D4AF37] hover:bg-white text-black py-4 text-xs font-sans font-bold uppercase tracking-[0.2em] transition-all cursor-pointer shadow-lg shadow-[#D4AF37]/10"
                  >
                    Voltar para a Vitrine
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT ORDER SUMMARY PANEL (5 cols) */}
          <div className="lg:col-span-12 xl:col-span-5 border-t lg:border-t-0 lg:border-l border-zinc-900 pt-6 lg:pt-0 lg:pl-8 space-y-6">
            <div className="text-xs font-mono text-zinc-500 font-black uppercase tracking-widest mb-1">
              Carrinho Consolidado ({cart.reduce((a, b) => a + b.quantity, 0)})
            </div>

            {/* Shopping cart items display */}
            <div className="space-y-3.5 max-h-[220px] overflow-y-auto scrollbar-thin pr-2">
              {cart.map((item, index) => (
                <div key={index} className="flex gap-3 items-center">
                  <img
                    src={item.product.images?.[0] || undefined}
                    alt=""
                    className="h-12 w-10 object-cover rounded bg-zinc-900 border border-zinc-900"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs text-zinc-300 truncate font-semibold">{item.product.name}</h4>
                    <p className="text-[9px] font-mono text-zinc-500 mt-0.5">
                      Qtd: <span className="text-zinc-300">{item.quantity}</span> • Tam: <span className="text-zinc-300">{item.selectedSize}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-zinc-300">
                    R$ {((item.product.promoPrice || item.product.price) * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

              <div className="border-t border-white/5 pt-4.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Subtotal bruto</span>
                  <span className="font-mono text-zinc-100">
                    R$ {rawSubtotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>Desconto de Cupom ({appliedCoupon.discountPercent}%)</span>
                    <span className="font-mono">
                      - R$ {discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-zinc-400">
                  <span>Frete de Envio</span>
                  {shippingPrice !== null ? (
                    <span className="font-mono text-zinc-100">
                      R$ {shippingPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-sans italic text-[10px]">Aguardando CEP</span>
                  )}
                </div>

                <div className="border-t border-white/10 my-2 pt-3.5 flex justify-between items-center text-white">
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">Total a Pagar</span>
                  <span className="text-xl font-bold text-[#D4AF37] font-sans">
                    R$ {grandTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Stepper buttons trigger */}
              <div className="pt-2">
                {step === 1 ? (
                  <button
                    id="checkout-finalize-btn"
                    onClick={handleCompleteOrder}
                    disabled={isProcessingOrder}
                    className="w-full flex items-center justify-center gap-2 rounded-sm bg-[#D4AF37] hover:bg-white py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-black transition-all shadow-lg hover:shadow-[#D4AF37]/20 border border-[#D4AF37] cursor-pointer disabled:opacity-30"
                  >
                    {isProcessingOrder ? 'Processando...' : 'Finalizar Pedido via WhatsApp'}
                    <Smartphone size={14} />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="w-full rounded-sm bg-white/5 hover:bg-white/10 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-all cursor-pointer border border-white/10"
                  >
                    Fechar
                  </button>
                )}
              </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
