import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, collection, getDocs, setDoc, writeBatch, serverTimestamp, getDocFromServer, increment, updateDoc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Product, Category, SiteConfig, Coupon } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL */
export const auth = getAuth();

// Test server-side connection as specified in SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

// Operation Types for error tracing
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Global Custom Firestore Error Handler (Mandatory constraint)
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Detailed Object: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Luxury catalog seed data
const SEED_CATEGORIES: Category[] = [
  { id: 'roupas', name: 'Roupas', active: true, createdAt: new Date().toISOString() },
  { id: 'tenis', name: 'Tênis', active: true, createdAt: new Date().toISOString() },
  { id: 'perfumes', name: 'Perfumes', active: true, createdAt: new Date().toISOString() }
];

const SEED_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Moletom Off-White "Arrow" Oversized Black',
    description: 'Moletom de alta costura em algodão premium com a icônica estampa das setas transpassadas nas costas. Modelagem oversized confortável e sofisticada com acabamento texturizado.',
    price: 1890,
    promoPrice: 1650,
    category: 'roupas',
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 12,
    sizes: ['P', 'M', 'G', 'GG'],
    colors: ['Preto Grafite', 'Branco Off'],
    brand: 'Off-White',
    featured: true,
    isNew: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p2',
    name: 'Camiseta Balenciaga "Paris Style" Vintage',
    description: 'Camiseta modelagem Streetwear de luxo com gola canelada de alta densidade e gravação desgastada vintage. Algodão lavado para toque único de exclusividade.',
    price: 1200,
    promoPrice: 980,
    category: 'roupas',
    images: [
      'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 8,
    sizes: ['P', 'M', 'G'],
    colors: ['Preto Desgastado', 'Branco Vintage'],
    brand: 'Balenciaga',
    featured: false,
    isNew: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p3',
    name: 'Jaqueta Puffer Prada Linea Rossa Nylon',
    description: 'Estilo esportivo tecnológico e ultraleve com isolamento térmico premium de plumas de ganso. Conta com a assinatura vermelha Prada Linea Rossa na lapela.',
    price: 4800,
    promoPrice: 4800,
    category: 'roupas',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 5,
    sizes: ['M', 'G', 'GG'],
    colors: ['Preto Carbono', 'Azul Marinho Royal'],
    brand: 'Prada',
    featured: true,
    isNew: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p4',
    name: 'Air Jordan 1 Retro High OG "Chicago Lost & Found"',
    description: 'A lenda do basquete redesenhada com acabamento em couro craquelado vintage simulando a icônica caixa empoeirada de 1985. A silhueta mais cobiçada por colecionadores de streetwear.',
    price: 2690,
    promoPrice: 2490,
    category: 'tenis',
    images: [
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 14,
    sizes: ['39', '40', '41', '42', '43'],
    colors: ['Chicago (Vermelho/Branco/Preto)'],
    brand: 'Nike Jordan',
    featured: true,
    isNew: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p5',
    name: 'Yeezy Boost 350 V2 "Onyx" Primeknit',
    description: 'O ápice do conforto com entressola encapsulada de tecnologia Adidas Boost inteiriça e tecido Primeknit respirável em tom monocromático furtivo.',
    price: 1950,
    promoPrice: 1950,
    category: 'tenis',
    images: [
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 9,
    sizes: ['38', '39', '40', '41', '42'],
    colors: ['Carbon Black'],
    brand: 'Adidas Yeezy',
    featured: false,
    isNew: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p6',
    name: 'Dior Sauvage Elixir Parfum Intense 60ml',
    description: 'Uma concentração extraordinária que desafia os limites dos perfumes masculinos de luxo. Notas intensas de madeiras nobres, especiarias selvagens e lavanda orgânica exclusiva.',
    price: 1150,
    promoPrice: 1150,
    category: 'perfumes',
    images: [
      'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 15,
    sizes: ['60ml'],
    colors: ['Azul Midnight'],
    brand: 'Dior',
    featured: true,
    isNew: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p7',
    name: 'Bleu de Chanel Eau de Parfum 100ml',
    description: 'Elegante, viril e profundamente sofisticado. Um aroma amadeirado aromático inesquecível que combina toranja cítrica fresca ao calor sensual do sândalo da Nova Caledônia.',
    price: 980,
    promoPrice: 890,
    category: 'perfumes',
    images: [
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 20,
    sizes: ['100ml'],
    colors: ['Deep Ocean Slate'],
    brand: 'Chanel',
    featured: true,
    isNew: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p8',
    name: 'Creed Aventus Royal Eau de Parfum 100ml',
    description: 'Frasco imperial esculpido com brasão histórico. Uma fragrância rústica frutada de bergamota real, abacaxi dourado de Calcutá e folha de bétula defumada, para homens que deixam legados.',
    price: 2950,
    promoPrice: 2650,
    category: 'perfumes',
    images: [
      'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80'
    ],
    stock: 6,
    sizes: ['100ml'],
    colors: ['Silver-wrapped Black'],
    brand: 'Creed',
    featured: true,
    isNew: true,
    createdAt: new Date().toISOString()
  }
];

const SEED_COUPONS: Coupon[] = [
  { code: 'DUBAI10', discountPercent: 10, expiryDate: '2028-12-31', active: true },
  { code: 'LUXO20', discountPercent: 20, expiryDate: '2028-12-31', active: true },
  { code: 'VIPVIP', discountPercent: 30, expiryDate: '2028-12-31', active: true }
];

const DEFAULT_SITE_CONFIG: SiteConfig = {
  pixKey: 'dubai@storepix.com.br',
  gateway: 'Stripe',
  instagram: 'https://instagram.com/dubaistore_luxo',
  facebook: 'https://facebook.com/dubaistore',
  tiktok: 'https://tiktok.com/@dubaistore',
  whatsapp: 'https://wa.me/5521985242409',
  youtube: 'https://youtube.com/dubaistore',
  creditCardEnabled: true,
  debitCardEnabled: true,
  pixEnabled: true
};

// Seeding engine to make the store functional from the very first boot!
export async function seedLuxuryBoutique(force: boolean = false) {
  try {
    const categoriesSnapshot = await getDocs(collection(db, 'categories'));
    
    // Check if seeding is already completed
    if (categoriesSnapshot.empty) {
      console.log('Database empty! Initiating premium seeding process for Dubai Store...');
      
      const batch = writeBatch(db);
      
      // 1. Seed Categories
      for (const cat of SEED_CATEGORIES) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      
      // 2. Seed Products
      for (const prod of SEED_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), prod);
      }
      
      // 3. Seed Coupons
      for (const coupon of SEED_COUPONS) {
        batch.set(doc(db, 'coupons', coupon.code), coupon);
      }
      
      // 4. Seed Standard Configurations
      batch.set(doc(db, 'siteConfig', 'global'), DEFAULT_SITE_CONFIG);
      
      await batch.commit();
      console.log('Seeding completed successfully! Dubai Store is fully loaded.');
    } else {
      console.log('Dubai Store already populated. Checking if seed perfumes and category are missing...');
      
      const perfumesCategoryRef = doc(db, 'categories', 'perfumes');
      const perfumesCategoryExists = categoriesSnapshot.docs.some(d => d.id === 'perfumes');
      const perfumesCategoryDoc = categoriesSnapshot.docs.find(d => d.id === 'perfumes');
      
      const batch = writeBatch(db);
      let needsCommit = false;

      if (!perfumesCategoryExists || force) {
        batch.set(perfumesCategoryRef, { id: 'perfumes', name: 'Perfumes', active: true, createdAt: new Date().toISOString() });
        needsCommit = true;
      } else if (perfumesCategoryDoc && !perfumesCategoryDoc.data().active) {
        batch.update(perfumesCategoryRef, { active: true });
        needsCommit = true;
      }

      // Check which seed perfumes are missing or force-update them
      const productsSnapshot = await getDocs(collection(db, 'products'));
      const existingProductIds = new Set(productsSnapshot.docs.map(doc => doc.id));

      const defaultPerfumes = SEED_PRODUCTS.filter(p => p.category === 'perfumes');
      for (const perf of defaultPerfumes) {
        if (!existingProductIds.has(perf.id) || force) {
          console.log(`Restoring default perfume: ${perf.name}`);
          batch.set(doc(db, 'products', perf.id), perf);
          needsCommit = true;
        }
      }

      if (needsCommit) {
        await batch.commit();
        console.log('Default perfumes and category successfully restored!');
      } else {
        console.log('All default perfumes are already present and active.');
      }
    }
  } catch (error) {
    console.error('Core Seeding failure: ', error);
  }
}

// Access tracking mechanism for metrics dashboard
export async function trackAccess() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const statsRef = doc(db, 'siteStats', 'visitors');

    // Attempt to read the document first
    const statsSnap = await getDoc(statsRef);
    if (!statsSnap.exists()) {
      // Create with initial values
      sessionStorage.setItem('dubai_visited_session', 'true');
      await setDoc(statsRef, {
        totalViews: 1,
        totalSessions: 1,
        dailyViews: {
          [today]: 1
        },
        dailySessions: {
          [today]: 1
        }
      });
      return;
    }

    // Determine if it is a new session
    const isNewSession = !sessionStorage.getItem('dubai_visited_session');
    
    // Setup update payload
    const updates: any = {};
    updates['totalViews'] = increment(1);
    updates[`dailyViews.${today}`] = increment(1);

    if (isNewSession) {
      sessionStorage.setItem('dubai_visited_session', 'true');
      updates['totalSessions'] = increment(1);
      updates[`dailySessions.${today}`] = increment(1);
    }

    await updateDoc(statsRef, updates);
  } catch (err) {
    console.warn('Silent warning - Failed to log access metric:', err);
  }
}

