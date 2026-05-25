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
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Delivery Address & Coupon, 2: Payment instrument, 3: Order CompletedReceipt

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

  // Payment Selection State
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Cartão de Débito'>('PIX');

  // Simulated Card Forms
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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

  // Process core Order validation, insert document and subtract stock
  const handleCompletePayment = async () => {
    if (step !== 2) return;
    
    // Address validation guard
    if (!address.street || !address.number || !address.city || !address.state || !address.zipCode) {
      alert('Por favor, preencha todos os campos obrigatórios do endereço.');
      setStep(1);
      return;
    }

    setIsProcessingOrder(true);
    const orderId = 'DBI-' + Math.floor(100000 + Math.random() * 900000);

    const pixCode = `00020101021226870014br.gov.bcb.pix2565${siteConfig.pixKey}5204000053039865405R$${grandTotal.toFixed(2)}5802BR5911DUBAISTORE6009SAOPAULO62070503***6304`;

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
      status: 'Pago', // Auto pay in simulation for best premium feel!
      paymentMethod,
      shippingAddress: address,
      paymentDetails: {
        pixQrCode: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(pixCode)}`,
        pixCopyPaste: pixCode,
        cardBrand: cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'Premium Card',
        cardLastDigits: cardNumber ? cardNumber.slice(-4) : '9988',
      },
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
        .replace(/\D/g, '') || '5511999999999';

      // Construct magnificent premium WhatsApp summary text
      let msgs = `👑 *DUBAI LUXURY STORE* 👑\n`;
      msgs += `*✦ NOVO PEDIDO CONFIRMADO ✦*\n\n`;
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
      
      msgs += `💼 *PAGAMENTO & ENVIO:*\n`;
      msgs += `• *Método:* ${paymentMethod}\n`;
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
      msgs += `✦ _Pedido enviado da vitrine inspirada em Dubai de alta ostentação._ ✦`;

      const waUrl = `https://wa.me/${cleanPhone}/?text=${encodeURIComponent(msgs)}`;

      setCreatedOrder(newOrder);
      setStep(3);
      onClearCart();

      // Open WhatsApp Dispatch link in a new tab
      window.open(waUrl, '_blank');
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
        {/* Modal headers */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
            <h2 className="text-[13px] font-bold tracking-[0.2em] text-white font-sans uppercase">
              {step === 1 ? 'Endereço & Cupom' : step === 2 ? 'Meio de Pagamento' : 'Sucesso da Compra'}
            </h2>
          </div>
          {step !== 3 && (
            <button
              onClick={onClose}
              className="rounded-full bg-white/5 p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
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

                  {/* Fast testing coupon suggest box */}
                  {!appliedCoupon && (
                    <div className="mt-4 flex gap-2 items-center flex-wrap">
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-white/30">Testar cupons:</span>
                      {['DUBAI10', 'LUXO20', 'VIPVIP'].map((mockCode) => (
                        <button
                          key={mockCode}
                          type="button"
                          onClick={() => handleApplyQuickCoupon(mockCode)}
                          className="bg-white/5 text-zinc-400 hover:text-[#D4AF37] hover:bg-white/10 font-mono text-[9px] px-3 py-1.5 rounded-sm border border-white/5 transition-colors cursor-pointer"
                        >
                          {mockCode}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Step 2 Form: Payment Instrument details */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="text-[10px] font-sans text-white/40 font-bold uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                  <CreditCard size={13} className="text-[#D4AF37]" />
                  Selecione o Método de Liquidação
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* PIX Selector */}
                  <button
                    onClick={() => setPaymentMethod('PIX')}
                    className={`flex flex-col items-center justify-center p-4 rounded-sm border transition-all cursor-pointer ${
                      paymentMethod === 'PIX'
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-white/5 text-white/50 border-white/5 hover:text-white'
                    }`}
                  >
                    <QrCode size={20} />
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider mt-2.5">PIX</span>
                    <span className="text-[8px] text-zinc-500 font-sans tracking-wide mt-1">Instantâneo</span>
                  </button>

                  {/* Credit Card Selector */}
                  <button
                    onClick={() => setPaymentMethod('Cartão de Crédito')}
                    className={`flex flex-col items-center justify-center p-4 rounded-sm border transition-all cursor-pointer ${
                      paymentMethod === 'Cartão de Crédito'
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-white/5 text-white/50 border-white/5 hover:text-white'
                    }`}
                  >
                    <CreditCard size={20} />
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider mt-2.5">Crédito</span>
                    <span className="text-[8px] text-zinc-500 font-sans tracking-wide mt-1">Até 12x s/ juros</span>
                  </button>

                  {/* Debit Card Selector */}
                  <button
                    onClick={() => setPaymentMethod('Cartão de Débito')}
                    className={`flex flex-col items-center justify-center p-4 rounded-sm border transition-all cursor-pointer ${
                      paymentMethod === 'Cartão de Débito'
                        ? 'bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37]'
                        : 'bg-white/5 text-white/50 border-white/5 hover:text-white'
                    }`}
                  >
                    <CreditCard size={20} />
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider mt-2.5">Débito</span>
                    <span className="text-[8px] text-zinc-500 font-sans tracking-wide mt-1">À Vista</span>
                  </button>
                </div>

                {/* Sub form of selected Payment options */}
                <div className="rounded-sm border border-white/5 bg-white/[0.02] p-6 min-h-[160px]">
                  {paymentMethod === 'PIX' ? (
                    <div className="flex flex-col items-center justify-center text-center space-y-3">
                      <QrCode size={40} className="text-[#D4AF37] stroke-[1.2]" />
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Liquidação por Qrcode PIX</h4>
                        <p className="text-[11px] text-zinc-500 mt-1.5 max-w-sm font-serif">
                          O pagamento é processado e liquidado na hora. Nós geramos o código copia-e-cola e o QR code para você escanear.
                        </p>
                      </div>
                      <div className="flex gap-2 items-center text-[9px] font-sans font-bold tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full mt-2 uppercase">
                        <Flame size={12} className="animate-pulse" />
                        DESCONTO DE 5% ADICIONAL NO PIX AUTOMÁTICO
                      </div>
                    </div>
                  ) : (
                    /* Elegant Credit Card Form simulation mockup */
                    <div className="space-y-4">
                      
                      {/* Virtual card preview visual */}
                      <div className="aspect-[1.58/1] w-72 max-w-full rounded-sm bg-gradient-to-tr from-[#141414] via-[#0A0A0A] to-[#1F1F1F] p-5 border border-white/10 shadow-xl text-left select-none relative overflow-hidden mx-auto mb-4">
                        <div className="absolute right-3 top-3 text-[8px] font-mono tracking-[0.2em] text-white/30 uppercase">Dubai Black</div>
                        <div className="h-8 w-11 rounded-sm bg-[#D4AF37] mb-6" /> {/* Chip */}
                        
                        <div className="text-xs font-mono tracking-widest text-[#D4AF37] mb-4">
                          {cardNumber || '•••• •••• •••• ••••'}
                        </div>

                        <div className="flex justify-between mt-2 flex-wrap">
                          <div>
                            <div className="text-[7px] font-sans font-bold text-white/30 uppercase tracking-widest">Titular</div>
                            <div className="text-[9px] font-mono text-white font-bold truncate max-w-44 uppercase">
                              {cardHolder || 'NOME PREMIUM'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[7px] font-sans font-bold text-white/30 uppercase tracking-widest">Validade</div>
                            <div className="text-[9px] font-mono text-white font-bold">{cardExpiry || 'MM/AA'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Card input controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-sans text-white/50 block font-bold uppercase mb-1">Número do Cartão:</label>
                          <input
                            type="text"
                            maxLength={19}
                            placeholder="4000 1234 5678 9010"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                            className="bg-white/5 text-white rounded-sm p-3 text-xs focus:outline-none w-full border border-white/5 focus:border-[#D4AF37]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-sans text-white/50 block font-bold uppercase mb-1">Nome do Titular:</label>
                          <input
                            type="text"
                            placeholder="Ex: GABRIEL MOTA"
                            value={cardHolder}
                            onChange={(e) => setCardHolder(e.target.value)}
                            className="bg-white/5 text-white rounded-sm p-3 text-xs focus:outline-none w-full border border-white/5 focus:border-[#D4AF37]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-sans text-white/50 block font-bold uppercase mb-1">Validade (MM/AA):</label>
                          <input
                            type="text"
                            maxLength={5}
                            placeholder="12/28"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="bg-white/5 text-white rounded-sm p-3 text-xs focus:outline-none w-full border border-white/5 focus:border-[#D4AF37] text-center"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-sans text-white/50 block font-bold uppercase mb-1">CVV:</label>
                          <input
                            type="password"
                            maxLength={4}
                            placeholder="123"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="bg-white/5 text-white rounded-sm p-3 text-xs focus:outline-none w-full border border-white/5 focus:border-[#D4AF37] text-center"
                          />
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {siteConfig.gateway === 'Mercado Pago' && (
                  <div className="flex items-center justify-center gap-2 text-[9px] text-[#D4AF37] bg-[#D4AF37]/5 border border-[#D4AF37]/10 py-2.5 px-4 rounded-sm max-w-sm mx-auto uppercase tracking-wider font-sans font-bold mt-4 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Liquidação segura via Mercado Pago VIP Ativo
                  </div>
                )}

              </div>
            )}

            {/* Step 3 Screen: Order Complete screen Receipt */}
            {step === 3 && createdOrder && (
              <div className="flex flex-col items-center justify-center text-center space-y-6 py-6">
                <motion.div
                  initial={{ scale: 0.8, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <CheckCircle size={56} className="text-emerald-400 stroke-[1.5]" />
                </motion.div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white uppercase tracking-wider font-display">Seu pedido foi faturado!</h3>
                  <p className="text-xs text-zinc-400 max-w-sm font-serif">
                    Parabéns por sua compra na Dubai Store. Um e-mail de confirmação foi despachado para{' '}
                    <span className="text-[#D4AF37] font-bold font-sans">{createdOrder.customerEmail}</span> contendo as credenciais de rastreio de frota.
                  </p>
                </div>

                {/* Specific payment options render review */}
                {createdOrder.paymentMethod === 'PIX' && (
                  <div className="rounded-sm border border-white/5 bg-white/[0.01] p-6 space-y-4 max-w-sm w-full">
                    <span className="text-[9px] font-sans text-white/40 font-bold uppercase tracking-widest block">QRCode PIX para Liquidação imediata:</span>
                    <div className="bg-white p-3 rounded-sm inline-block mx-auto border border-white/10 shadow-lg">
                      <img src={createdOrder.paymentDetails?.pixQrCode || undefined} alt="PIX Qrcode" className="h-44 w-44" />
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={handleCopyPix}
                        className="w-full flex items-center justify-center gap-2 rounded-sm bg-white/5 hover:bg-white/10 text-white py-3.5 text-xs font-sans font-bold uppercase tracking-[0.15em] transition cursor-pointer"
                      >
                        <Clipboard size={12} className="text-[#D4AF37]" />
                        Copiar Código PIX
                      </button>
                    </div>
                  </div>
                )}

                <div className="text-[11px] font-mono text-white/50 bg-white/5 px-5 py-2.5 rounded-sm border border-white/5 flex items-center gap-1.5 tracking-wider">
                  TRANS-REF: <span className="text-[#D4AF37] font-black">{createdOrder.id}</span>
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

                {paymentMethod === 'PIX' && step === 2 && (
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span>Desconto especial PIX (5%)</span>
                    <span className="font-mono">
                      - R$ {(grandTotal * 0.05).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">Total Concedido</span>
                  <span className="text-xl font-bold text-[#D4AF37] font-sans">
                    R$ {(paymentMethod === 'PIX' && step === 2 ? grandTotal * 0.95 : grandTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Stepper buttons trigger */}
              {step !== 3 && (
                <div className="pt-2">
                  {step === 1 ? (
                    <button
                      id="checkout-next-payment-btn"
                      onClick={() => {
                        if (!address.street || !address.number || !address.city || !address.state || !address.zipCode) {
                          alert('Por favor, preencha todos os campos obrigatórios do endereço.');
                          return;
                        }
                        if (shippingPrice === null) {
                          setShippingPrice(22.50);
                          setShippingCarrier('SEDEX VIP • Envio Expresso');
                        }
                        setStep(2);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-sm bg-[#D4AF37] hover:bg-white py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-black transition-all shadow-lg hover:shadow-[#D4AF37]/20 border border-[#D4AF37] cursor-pointer"
                    >
                      Seguir para Pagamento
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <button
                        id="checkout-submit-order-payment-btn"
                        onClick={handleCompletePayment}
                        disabled={isProcessingOrder}
                        className="w-full rounded-sm bg-[#D4AF37] hover:bg-white py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-black transition-all cursor-pointer shadow-lg hover:shadow-[#D4AF37]/20 border border-[#D4AF37] disabled:opacity-30 flex items-center justify-center gap-2"
                      >
                        {isProcessingOrder ? 'Processando Autenticação...' : 'Finalizar Pedido de Luxo'}
                      </button>
                      <button
                        onClick={() => setStep(1)}
                        className="w-full text-center text-zinc-500 hover:text-white font-sans text-[10px] uppercase font-bold tracking-widest py-1 cursor-pointer"
                      >
                        ← Voltar para endereço
                      </button>
                    </div>
                  )}
                </div>
              )}

          </div>

        </div>

      </motion.div>
    </div>
  );
}
