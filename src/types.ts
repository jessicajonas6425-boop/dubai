export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice: number;
  category: string; // "Roupas" | "Tênis" | "Perfumes"
  subcategory?: string; // "Perfumes Árabes" | "Perfumes Importados" | "Camisas de Times" | "Camisas da NBA"
  images: string[];
  stock: number;
  sizes: string[];
  colors: string[];
  brand: string;
  featured: boolean;
  isNew: boolean;
  createdAt: string;
}

export interface Category {
  id: string; // Standardized string ID (e.g. "roupas", "tenis", "perfumes")
  name: string;
  active: boolean;
  createdAt: string;
  subcategories?: string[]; // List of subcategories under this category
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
}

export interface OrderAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  total: number;
  status: 'Pendente' | 'Pago' | 'Enviado' | 'Cancelado';
  paymentMethod: 'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'WhatsApp';
  shippingAddress: OrderAddress;
  paymentDetails?: {
    pixQrCode?: string;
    pixCopyPaste?: string;
    cardBrand?: string;
    cardLastDigits?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  code: string;
  discountPercent: number;
  expiryDate: string;
  active: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  phone: string;
  blocked: boolean;
  addresses: OrderAddress[];
  favorites: string[]; // List of Product IDs
  createdAt: string;
}

export interface SiteConfig {
  pixKey: string;
  gateway: 'Stripe' | 'Mercado Pago' | 'PagSeguro';
  instagram: string;
  facebook: string;
  tiktok: string;
  whatsapp: string;
  youtube: string;
  creditCardEnabled: boolean;
  debitCardEnabled: boolean;
  pixEnabled: boolean;
  mercadoPagoToken?: string;
  mercadoPagoPublicKey?: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  selectedSize: string;
  selectedColor: string;
  quantity: number;
}
