/**
 * Seed data for SHOPZY — Bhopal, Madhya Pradesh.
 * Coordinates are real locality centroids ([longitude, latitude]).
 */

export const CATEGORIES = [
  {
    name: 'Salons & Spa',
    slug: 'salons',
    description: 'Haircuts, grooming, beauty treatments and spa services near you.',
    icon: 'Scissors',
    color: '#ec4899',
    displayOrder: 1,
    subCategories: [
      { name: 'Barber Shop', slug: 'barber', icon: 'Scissors' },
      { name: 'Unisex Salon', slug: 'unisex-salon', icon: 'Sparkles' },
      { name: 'Spa & Massage', slug: 'spa', icon: 'Flower2' },
    ],
    meta: {
      title: 'Best Salons in Bhopal — Compare Haircut Prices | SHOPZY',
      description: 'Find and compare salon prices in Bhopal. Haircuts, facials, spa and grooming near you.',
      keywords: ['salon bhopal', 'haircut price bhopal', 'unisex salon mp nagar'],
    },
  },
  {
    name: 'Restaurants & Cafes',
    slug: 'restaurants',
    description: 'Local eateries, cafes, bakeries and street food joints.',
    icon: 'UtensilsCrossed',
    color: '#f97316',
    displayOrder: 2,
    subCategories: [
      { name: 'Cafe', slug: 'cafe', icon: 'Coffee' },
      { name: 'Fine Dining', slug: 'fine-dining', icon: 'ChefHat' },
      { name: 'Street Food', slug: 'street-food', icon: 'Sandwich' },
      { name: 'Bakery', slug: 'bakery', icon: 'Cake' },
    ],
    meta: {
      title: 'Top Restaurants in Bhopal — Menus & Prices | SHOPZY',
      description: 'Discover restaurants and cafes in Bhopal with live menus, prices, offers and reviews.',
      keywords: ['restaurants bhopal', 'cafe new market', 'best food bhopal'],
    },
  },
  {
    name: 'Grocery & Kirana',
    slug: 'grocery',
    description: 'Daily needs, kirana stores, supermarkets and organic produce.',
    icon: 'ShoppingBasket',
    color: '#22c55e',
    displayOrder: 3,
    subCategories: [
      { name: 'Kirana Store', slug: 'kirana', icon: 'Store' },
      { name: 'Supermarket', slug: 'supermarket', icon: 'ShoppingCart' },
      { name: 'Fruits & Vegetables', slug: 'fruits-vegetables', icon: 'Apple' },
    ],
    meta: {
      title: 'Grocery Stores in Bhopal — Compare Daily Essentials | SHOPZY',
      description: 'Compare grocery prices across kirana stores and supermarkets in Bhopal.',
      keywords: ['grocery bhopal', 'kirana store near me', 'supermarket bhopal'],
    },
  },
  {
    name: 'Gyms & Fitness',
    slug: 'gyms',
    description: 'Gyms, yoga studios, CrossFit boxes and personal trainers.',
    icon: 'Dumbbell',
    color: '#8b5cf6',
    displayOrder: 4,
    subCategories: [
      { name: 'Gym', slug: 'gym', icon: 'Dumbbell' },
      { name: 'Yoga Studio', slug: 'yoga', icon: 'Flower' },
      { name: 'CrossFit', slug: 'crossfit', icon: 'Activity' },
    ],
    meta: {
      title: 'Gyms in Bhopal — Membership Fees Compared | SHOPZY',
      description: 'Compare gym membership prices in Bhopal. Monthly, quarterly and annual plans.',
      keywords: ['gym bhopal', 'gym fees bhopal', 'yoga classes bhopal'],
    },
  },
  {
    name: 'Electronics & Repair',
    slug: 'electronics',
    description: 'Mobile phones, laptops, accessories, and repair services.',
    icon: 'Smartphone',
    color: '#0ea5e9',
    displayOrder: 5,
    subCategories: [
      { name: 'Mobile Store', slug: 'mobile-store', icon: 'Smartphone' },
      { name: 'Computer & Laptop', slug: 'computers', icon: 'Laptop' },
      { name: 'Repair Service', slug: 'repair', icon: 'Wrench' },
    ],
    meta: {
      title: 'Electronics Shops in Bhopal — Price Comparison | SHOPZY',
      description: 'Compare mobile, laptop and repair prices across electronics shops in Bhopal.',
      keywords: ['mobile shop bhopal', 'laptop repair bhopal', 'screen replacement price'],
    },
  },
  {
    name: 'Healthcare & Pharmacy',
    slug: 'healthcare',
    description: 'Clinics, diagnostic labs, pharmacies and dental care.',
    icon: 'Stethoscope',
    color: '#ef4444',
    displayOrder: 6,
    subCategories: [
      { name: 'Pharmacy', slug: 'pharmacy', icon: 'Pill' },
      { name: 'Diagnostic Lab', slug: 'diagnostics', icon: 'TestTube' },
      { name: 'Dental Clinic', slug: 'dental', icon: 'Smile' },
    ],
    meta: {
      title: 'Clinics & Pharmacies in Bhopal | SHOPZY',
      description: 'Find pharmacies, labs and clinics in Bhopal with consultation and test prices.',
      keywords: ['pharmacy bhopal', 'blood test price bhopal', 'dentist bhopal'],
    },
  },
  {
    name: 'Home Services',
    slug: 'home-services',
    description: 'Plumbers, electricians, cleaning, carpentry and pest control.',
    icon: 'Wrench',
    color: '#f59e0b',
    displayOrder: 7,
    subCategories: [
      { name: 'Plumbing', slug: 'plumbing', icon: 'Droplet' },
      { name: 'Electrical', slug: 'electrical', icon: 'Zap' },
      { name: 'Cleaning', slug: 'cleaning', icon: 'SprayCan' },
    ],
    meta: {
      title: 'Home Services in Bhopal — Book Verified Professionals | SHOPZY',
      description: 'Compare rates for plumbers, electricians and cleaning services in Bhopal.',
      keywords: ['plumber bhopal', 'electrician near me', 'deep cleaning bhopal'],
    },
  },
  {
    name: 'Fashion & Apparel',
    slug: 'fashion',
    description: 'Clothing, footwear, tailoring and ethnic wear.',
    icon: 'Shirt',
    color: '#14b8a6',
    displayOrder: 8,
    subCategories: [
      { name: 'Menswear', slug: 'menswear', icon: 'Shirt' },
      { name: 'Womenswear', slug: 'womenswear', icon: 'ShoppingBag' },
      { name: 'Footwear', slug: 'footwear', icon: 'Footprints' },
      { name: 'Tailor', slug: 'tailor', icon: 'Scissors' },
    ],
    meta: {
      title: 'Clothing Stores in Bhopal | SHOPZY',
      description: 'Browse fashion stores, tailors and footwear shops across Bhopal.',
      keywords: ['clothes shop bhopal', 'tailor new market', 'shoes bhopal'],
    },
  },
];

const weekday = (open: string, close: string) => ({ open, close, isOpen: true });

interface SeedDay {
  open?: string;
  close?: string;
  isOpen?: boolean;
  breaks?: Array<{ start: string; end: string }>;
}

interface SeedHours {
  timezone: string;
  schedule: Record<string, SeedDay>;
  specialHours: Array<Record<string, unknown>>;
}

const standardHours = (open = '10:00', close = '21:00', sundayClosed = false): SeedHours => ({
  timezone: 'Asia/Kolkata',
  schedule: {
    monday: weekday(open, close),
    tuesday: weekday(open, close),
    wednesday: weekday(open, close),
    thursday: weekday(open, close),
    friday: weekday(open, close),
    saturday: weekday(open, close),
    sunday: sundayClosed ? { isOpen: false } : weekday(open, close),
  },
  specialHours: [],
});

export interface SeedShop {
  name: string;
  description: string;
  category: string;
  subCategory: string;
  tags: string[];
  phone: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  coordinates: [number, number];
  address: string;
  landmark: string;
  pincode: string;
  hours: SeedHours;
  items: Array<{ name: string; price: number; comparePrice?: number; unit?: string; category?: string; description?: string }>;
  offers?: Array<{
    title: string;
    description?: string;
    discountType: 'percentage' | 'fixed' | 'buy_one_get_one';
    discountValue: number;
    code?: string;
    minOrderValue?: number;
  }>;
  features: Record<string, boolean>;
  verification: 'verified' | 'pending' | 'under_review';
  isFeatured?: boolean;
  seedRating: { average: number; total: number };
  views: number;
}

export const SHOPS: SeedShop[] = [
  {
    name: 'Studio 9 Unisex Salon',
    description:
      'Premium unisex salon in MP Nagar Zone 1 offering haircuts, hair spa, bridal makeup and grooming. Certified stylists, sanitised tools and no-appointment walk-ins on weekdays.',
    category: 'salons',
    subCategory: 'unisex-salon',
    tags: ['haircut', 'beard-trim', 'hair-spa', 'facial', 'bridal-makeup', 'unisex'],
    phone: '9826101101',
    whatsapp: '9826101101',
    email: 'hello@studio9bhopal.in',
    coordinates: [77.4348, 23.2332],
    address: 'Shop 12, Zone 1, MP Nagar',
    landmark: 'MP Nagar',
    pincode: '462011',
    hours: standardHours('10:00', '21:00'),
    items: [
      { name: 'Haircut (Men)', price: 250, comparePrice: 350, unit: 'per session', category: 'Hair Services' },
      { name: 'Haircut (Women)', price: 600, comparePrice: 800, unit: 'per session', category: 'Hair Services' },
      { name: 'Beard Trim & Shape', price: 150, unit: 'per session', category: 'Grooming' },
      { name: 'Hair Spa', price: 1200, comparePrice: 1500, unit: 'per session', category: 'Hair Services' },
      { name: 'Hair Colour (Global)', price: 2500, unit: 'per session', category: 'Hair Services' },
      { name: 'Clean-Up Facial', price: 800, unit: 'per session', category: 'Skin Care' },
      { name: 'Bridal Makeup Package', price: 12000, comparePrice: 15000, unit: 'package', category: 'Bridal' },
    ],
    offers: [
      {
        title: '20% off on first visit',
        description: 'Valid on all hair services for new customers.',
        discountType: 'percentage',
        discountValue: 20,
        code: 'FIRST20',
        minOrderValue: 500,
      },
    ],
    features: { hasBooking: true, hasParking: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, hasOnlinePayment: true },
    verification: 'verified',
    isFeatured: true,
    seedRating: { average: 4.6, total: 128 },
    views: 3420,
  },
  {
    name: 'The Barber Room',
    description:
      'Classic barbershop in Arera Colony specialising in men\'s grooming — fades, hot-towel shaves and beard sculpting. Walk-ins welcome, average wait under 15 minutes.',
    category: 'salons',
    subCategory: 'barber',
    tags: ['haircut', 'barber', 'shave', 'beard-trim', 'men'],
    phone: '9826102202',
    coordinates: [77.4256, 23.2178],
    address: 'E-3/45, Arera Colony',
    landmark: 'Arera Colony',
    pincode: '462016',
    hours: standardHours('09:00', '20:30', true),
    items: [
      { name: 'Haircut (Men)', price: 180, unit: 'per session', category: 'Hair Services' },
      { name: 'Beard Trim & Shape', price: 100, unit: 'per session', category: 'Grooming' },
      { name: 'Hot Towel Shave', price: 200, unit: 'per session', category: 'Grooming' },
      { name: 'Head Massage', price: 250, unit: '20 mins', category: 'Grooming' },
      { name: 'Hair Colour (Men)', price: 700, unit: 'per session', category: 'Hair Services' },
    ],
    features: { acceptsUPI: true, acceptsCash: true, hasParking: false },
    verification: 'verified',
    seedRating: { average: 4.3, total: 74 },
    views: 1580,
  },
  {
    name: 'Cafe Kabuli',
    description:
      'Cosy multi-cuisine cafe near New Market serving Afghani rolls, wood-fired pizzas, cold brews and desserts. Free Wi-Fi, laptop-friendly seating and a rooftop section.',
    category: 'restaurants',
    subCategory: 'cafe',
    tags: ['cafe', 'coffee', 'pizza', 'rolls', 'wifi', 'rooftop'],
    phone: '9826103303',
    whatsapp: '9826103303',
    website: 'https://cafekabuli.example.in',
    coordinates: [77.4008, 23.2337],
    address: '18, TT Nagar Main Road, New Market',
    landmark: 'New Market',
    pincode: '462003',
    hours: standardHours('11:00', '23:00'),
    items: [
      { name: 'Cappuccino', price: 130, unit: 'regular', category: 'Beverages' },
      { name: 'Cold Brew', price: 180, unit: '300ml', category: 'Beverages' },
      { name: 'Afghani Chicken Roll', price: 220, comparePrice: 260, unit: 'single', category: 'Main Course' },
      { name: 'Margherita Pizza', price: 320, unit: '9 inch', category: 'Main Course' },
      { name: 'Farmhouse Pizza', price: 420, unit: '9 inch', category: 'Main Course' },
      { name: 'Paneer Tikka Sandwich', price: 190, unit: 'single', category: 'Snacks' },
      { name: 'Chocolate Brownie with Ice Cream', price: 210, unit: 'single', category: 'Desserts' },
    ],
    offers: [
      {
        title: 'Buy 1 Get 1 on all coffees',
        description: 'Weekdays 3 PM – 6 PM only.',
        discountType: 'buy_one_get_one',
        discountValue: 100,
        code: 'BREW2',
      },
      {
        title: 'Flat ₹100 off above ₹599',
        discountType: 'fixed',
        discountValue: 100,
        minOrderValue: 599,
        code: 'KABULI100',
      },
    ],
    features: { hasDelivery: true, hasOnlinePayment: true, hasParking: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, isWheelchairAccessible: true },
    verification: 'verified',
    isFeatured: true,
    seedRating: { average: 4.4, total: 312 },
    views: 8940,
  },
  {
    name: 'Sagar Gaire Fast Food',
    description:
      'Bhopal institution near the lake serving poha-jalebi, chaat, South Indian and shakes since 1985. Expect queues on weekend evenings.',
    category: 'restaurants',
    subCategory: 'street-food',
    tags: ['poha', 'chaat', 'dosa', 'shakes', 'street-food', 'breakfast'],
    phone: '9826104404',
    coordinates: [77.3925, 23.2489],
    address: 'Near Boat Club, Lake View Road',
    landmark: 'Lower Lake',
    pincode: '462001',
    hours: standardHours('07:00', '22:30'),
    items: [
      { name: 'Poha Jalebi', price: 60, unit: 'plate', category: 'Breakfast' },
      { name: 'Masala Dosa', price: 110, unit: 'plate', category: 'South Indian' },
      { name: 'Paneer Tikka Sandwich', price: 140, unit: 'single', category: 'Snacks' },
      { name: 'Dahi Puri', price: 80, unit: 'plate', category: 'Chaat' },
      { name: 'Cold Coffee', price: 90, unit: '300ml', category: 'Beverages' },
      { name: 'Mango Shake', price: 120, unit: '400ml', category: 'Beverages' },
    ],
    features: { hasDelivery: true, acceptsUPI: true, acceptsCash: true, hasParking: true },
    verification: 'verified',
    seedRating: { average: 4.2, total: 640 },
    views: 12300,
  },
  {
    name: 'Anand Kirana & General Store',
    description:
      'Neighbourhood kirana in Kolar Road stocking daily essentials, packaged foods, pulses and household items. Home delivery within 3 km on orders above ₹300.',
    category: 'grocery',
    subCategory: 'kirana',
    tags: ['grocery', 'kirana', 'atta', 'rice', 'oil', 'daily-needs'],
    phone: '9826105505',
    whatsapp: '9826105505',
    coordinates: [77.4111, 23.1798],
    address: 'Shop 4, Danish Nagar, Kolar Road',
    landmark: 'Kolar Road',
    pincode: '462042',
    hours: standardHours('08:00', '22:00'),
    items: [
      { name: 'Aashirvaad Atta 5kg', price: 265, comparePrice: 285, unit: '5 kg', category: 'Staples' },
      { name: 'Fortune Sunflower Oil 1L', price: 145, unit: '1 litre', category: 'Staples' },
      { name: 'Basmati Rice (Loose)', price: 95, unit: 'per kg', category: 'Staples' },
      { name: 'Toor Dal', price: 165, unit: 'per kg', category: 'Pulses' },
      { name: 'Amul Milk 500ml', price: 28, unit: '500 ml', category: 'Dairy' },
      { name: 'Sugar', price: 46, unit: 'per kg', category: 'Staples' },
      { name: 'Tata Salt 1kg', price: 26, unit: '1 kg', category: 'Staples' },
    ],
    offers: [
      { title: 'Free delivery above ₹300', discountType: 'fixed', discountValue: 0, minOrderValue: 300 },
    ],
    features: { hasDelivery: true, acceptsUPI: true, acceptsCash: true },
    verification: 'verified',
    seedRating: { average: 4.1, total: 56 },
    views: 940,
  },
  {
    name: 'FreshMart Supermarket',
    description:
      'Air-conditioned supermarket in Shahpura with fresh produce, imported groceries, frozen foods and a bakery counter. Loyalty points on every purchase.',
    category: 'grocery',
    subCategory: 'supermarket',
    tags: ['supermarket', 'grocery', 'vegetables', 'frozen', 'bakery'],
    phone: '9826106606',
    coordinates: [77.4302, 23.2035],
    address: 'Plot 22, Shahpura Main Road',
    landmark: 'Shahpura',
    pincode: '462039',
    hours: standardHours('09:00', '22:00'),
    items: [
      { name: 'Aashirvaad Atta 5kg', price: 279, unit: '5 kg', category: 'Staples' },
      { name: 'Fortune Sunflower Oil 1L', price: 152, unit: '1 litre', category: 'Staples' },
      { name: 'Basmati Rice (Loose)', price: 110, unit: 'per kg', category: 'Staples' },
      { name: 'Toor Dal', price: 158, comparePrice: 175, unit: 'per kg', category: 'Pulses' },
      { name: 'Amul Milk 500ml', price: 28, unit: '500 ml', category: 'Dairy' },
      { name: 'Tomato', price: 40, unit: 'per kg', category: 'Vegetables' },
      { name: 'Onion', price: 35, unit: 'per kg', category: 'Vegetables' },
      { name: 'Brown Bread', price: 45, unit: '400 g', category: 'Bakery' },
    ],
    offers: [
      {
        title: '10% off on fruits & vegetables',
        description: 'Every Tuesday and Wednesday.',
        discountType: 'percentage',
        discountValue: 10,
        code: 'VEGDAY',
      },
    ],
    features: { hasDelivery: true, hasOnlinePayment: true, hasParking: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, isWheelchairAccessible: true },
    verification: 'verified',
    seedRating: { average: 4.0, total: 187 },
    views: 4100,
  },
  {
    name: 'IronCore Fitness Studio',
    description:
      'Fully equipped gym in MP Nagar Zone 2 with strength, cardio and functional zones. Certified trainers, physiotherapy tie-up and separate ladies hours.',
    category: 'gyms',
    subCategory: 'gym',
    tags: ['gym', 'fitness', 'personal-training', 'cardio', 'crossfit', 'zumba'],
    phone: '9826107707',
    email: 'join@ironcore.example.in',
    coordinates: [77.4381, 23.2301],
    address: '2nd Floor, Zone 2, MP Nagar',
    landmark: 'MP Nagar',
    pincode: '462011',
    hours: {
      timezone: 'Asia/Kolkata',
      schedule: {
        monday: { open: '05:30', close: '22:00', isOpen: true, breaks: [{ start: '14:00', end: '16:00' }] },
        tuesday: { open: '05:30', close: '22:00', isOpen: true, breaks: [{ start: '14:00', end: '16:00' }] },
        wednesday: { open: '05:30', close: '22:00', isOpen: true, breaks: [{ start: '14:00', end: '16:00' }] },
        thursday: { open: '05:30', close: '22:00', isOpen: true, breaks: [{ start: '14:00', end: '16:00' }] },
        friday: { open: '05:30', close: '22:00', isOpen: true, breaks: [{ start: '14:00', end: '16:00' }] },
        saturday: { open: '06:00', close: '20:00', isOpen: true },
        sunday: { isOpen: false },
      },
      specialHours: [],
    },
    items: [
      { name: 'Monthly Membership', price: 1500, comparePrice: 1800, unit: 'per month', category: 'Membership' },
      { name: 'Quarterly Membership', price: 4000, comparePrice: 4500, unit: '3 months', category: 'Membership' },
      { name: 'Annual Membership', price: 12000, comparePrice: 18000, unit: '12 months', category: 'Membership' },
      { name: 'Personal Training', price: 6000, unit: 'per month', category: 'Training' },
      { name: 'Zumba Class', price: 1200, unit: 'per month', category: 'Group Classes' },
      { name: 'Diet Consultation', price: 800, unit: 'per session', category: 'Wellness' },
    ],
    offers: [
      {
        title: 'Annual plan — 2 months free',
        description: 'Pay for 10 months, train for 12.',
        discountType: 'percentage',
        discountValue: 16,
        code: 'IRON12',
      },
    ],
    features: { hasBooking: true, hasParking: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, hasOnlinePayment: true },
    verification: 'verified',
    isFeatured: true,
    seedRating: { average: 4.5, total: 96 },
    views: 2760,
  },
  {
    name: 'Shanti Yoga Kendra',
    description:
      'Traditional yoga and meditation centre near Shahpura Lake. Morning and evening batches, therapeutic yoga for back pain and prenatal classes.',
    category: 'gyms',
    subCategory: 'yoga',
    tags: ['yoga', 'meditation', 'pranayama', 'prenatal', 'wellness'],
    phone: '9826108808',
    coordinates: [77.4228, 23.2014],
    address: 'B-7, Shahpura Lake Road',
    landmark: 'Shahpura Lake',
    pincode: '462039',
    hours: standardHours('05:30', '19:00'),
    items: [
      { name: 'Monthly Membership', price: 900, unit: 'per month', category: 'Membership' },
      { name: 'Quarterly Membership', price: 2400, unit: '3 months', category: 'Membership' },
      { name: 'Personal Yoga Session', price: 500, unit: 'per session', category: 'Training' },
      { name: 'Prenatal Yoga', price: 1500, unit: 'per month', category: 'Specialised' },
      { name: 'Meditation Workshop', price: 2000, unit: 'weekend', category: 'Workshops' },
    ],
    features: { hasBooking: true, acceptsUPI: true, acceptsCash: true, isWheelchairAccessible: true },
    verification: 'verified',
    seedRating: { average: 4.7, total: 43 },
    views: 1120,
  },
  {
    name: 'MobileHub Electronics',
    description:
      'Authorised dealer for major smartphone brands in New Market with an in-house repair lab. Same-day screen and battery replacement for most models.',
    category: 'electronics',
    subCategory: 'mobile-store',
    tags: ['mobile', 'smartphone', 'repair', 'screen-replacement', 'accessories', 'battery'],
    phone: '9826109909',
    whatsapp: '9826109909',
    coordinates: [77.3989, 23.2352],
    address: 'Shop 31, New Market Complex',
    landmark: 'New Market',
    pincode: '462003',
    hours: standardHours('10:30', '20:30', true),
    items: [
      { name: 'Fast USB-C Charger 33W', price: 420, comparePrice: 599, unit: 'per unit', category: 'Accessories', description: 'Fast charging adapter compatible with all Type-C phones' },
      { name: 'Headphones with Mic (Online Classes)', price: 799, comparePrice: 999, unit: 'per unit', category: 'Audio', description: 'Over-ear stereo headset with clear microphone for online classes and meetings' },
      { name: 'Wireless Bluetooth Earbuds', price: 999, comparePrice: 1499, unit: 'per unit', category: 'Audio', description: 'True wireless stereo earbuds with touch control and low latency' },
      { name: 'Wireless Gaming Mouse', price: 499, comparePrice: 699, unit: 'per unit', category: 'Accessories', description: 'Ergonomic 2.4GHz wireless optical mouse with adjustable DPI' },
      { name: 'Mobile Screen Replacement', price: 2500, comparePrice: 3200, unit: 'starting from', category: 'Repair' },
      { name: 'Battery Replacement', price: 1200, unit: 'starting from', category: 'Repair' },
      { name: 'Software Reinstall', price: 400, unit: 'per device', category: 'Repair' },
      { name: 'Charging Port Repair', price: 900, unit: 'per device', category: 'Repair' },
      { name: 'Tempered Glass', price: 250, comparePrice: 400, unit: 'per unit', category: 'Accessories' },
    ],
    offers: [
      {
        title: 'Free tempered glass with any repair',
        discountType: 'fixed',
        discountValue: 250,
        code: 'SAFEGLASS',
        minOrderValue: 1000,
      },
      {
        title: '10% off on all chargers and accessories',
        discountType: 'percentage',
        discountValue: 10,
        code: 'TECH10',
        minOrderValue: 300,
      },
    ],
    features: { hasDelivery: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, hasParking: false },
    verification: 'verified',
    seedRating: { average: 4.2, total: 152 },
    views: 5230,
  },
  {
    name: 'TechFix Laptop Service',
    description:
      'Independent laptop and desktop repair workshop in Bittan Market. Motherboard-level repair, SSD upgrades, accessories and data recovery with a 90-day service warranty.',
    category: 'electronics',
    subCategory: 'repair',
    tags: ['laptop', 'repair', 'ssd', 'headphones', 'charger', 'mouse', 'computer'],
    phone: '9826110010',
    coordinates: [77.4189, 23.2261],
    address: 'G-8, Bittan Market',
    landmark: 'Bittan Market',
    pincode: '462016',
    hours: standardHours('10:00', '19:30', true),
    items: [
      { name: 'Headphones with Mic (Online Classes)', price: 899, comparePrice: 1199, unit: 'per unit', category: 'Audio', description: 'Over-ear padded headset with noise-reduction microphone' },
      { name: 'Wireless Bluetooth Earphones', price: 1299, comparePrice: 1699, unit: 'per unit', category: 'Audio', description: 'Bluetooth in-ear neckband with 24-hour battery' },
      { name: 'Fast USB-C Charger 33W', price: 450, comparePrice: 550, unit: 'per unit', category: 'Accessories', description: 'PD 3.0 fast wall charger adapter' },
      { name: 'Wireless Optical Mouse', price: 350, comparePrice: 500, unit: 'per unit', category: 'Accessories', description: 'Silent click wireless office and college mouse' },
      { name: 'Laptop Servicing', price: 800, unit: 'per device', category: 'Repair' },
      { name: 'SSD Upgrade 512GB', price: 3800, comparePrice: 4500, unit: 'installed', category: 'Upgrade' },
      { name: 'RAM Upgrade 8GB', price: 2200, unit: 'installed', category: 'Upgrade' },
      { name: 'Data Recovery', price: 2500, unit: 'starting from', category: 'Recovery' },
      { name: 'Keyboard Replacement', price: 1600, unit: 'per device', category: 'Repair' },
    ],
    features: { acceptsUPI: true, acceptsCash: true, acceptsCard: true, hasDelivery: true },
    verification: 'verified',
    seedRating: { average: 4.4, total: 38 },
    views: 870,
  },
  {
    name: 'Shree Ram Electronics & Gadgets',
    description:
      'Trusted consumer electronics and mobile accessories store in MP Nagar Zone 2. Authorised retailer for audio accessories, high-speed chargers and peripherals with instant GST invoice.',
    category: 'electronics',
    subCategory: 'mobile-store',
    tags: ['electronics', 'headphones', 'charger', 'audio', 'earphones', 'mouse', 'gadgets'],
    phone: '9826115515',
    whatsapp: '9826115515',
    coordinates: [77.4372, 23.2325],
    address: 'Shop 18, Zone 2, MP Nagar',
    landmark: 'MP Nagar',
    pincode: '462011',
    hours: standardHours('10:00', '21:00'),
    items: [
      { name: 'Headphones with Mic (Online Classes)', price: 950, comparePrice: 1299, unit: 'per unit', category: 'Audio', description: 'Clear voice USB/3.5mm over-ear headphone ideal for Zoom and Google Meet' },
      { name: 'Fast USB-C Charger 33W', price: 475, comparePrice: 650, unit: 'per unit', category: 'Accessories', description: 'Dual port USB-A & Type-C fast charger' },
      { name: 'Fast USB-C Charger (Basic 20W)', price: 299, comparePrice: 399, unit: 'per unit', category: 'Accessories', description: 'Compact fast charger for all smartphones' },
      { name: 'Wireless Bluetooth Earbuds', price: 1199, comparePrice: 1599, unit: 'per unit', category: 'Audio', description: 'Bass boosted wireless earbuds with charging case' },
      { name: 'Wireless Gaming Mouse', price: 550, comparePrice: 750, unit: 'per unit', category: 'Accessories', description: '6-button ergonomic wireless gaming mouse' },
      { name: 'Laptop Cooling Pad', price: 650, unit: 'per unit', category: 'Accessories', description: 'Dual fan cooling stand for 13-17 inch laptops' },
    ],
    offers: [
      {
        title: '₹50 instant discount on UPI payments',
        discountType: 'fixed',
        discountValue: 50,
        minOrderValue: 400,
      },
    ],
    features: { hasDelivery: true, acceptsUPI: true, acceptsCash: true, acceptsCard: true, hasParking: true },
    verification: 'verified',
    seedRating: { average: 4.5, total: 64 },
    views: 3120,
  },
  {
    name: 'LifeCare Pharmacy & Diagnostics',
    description:
      '24×7 pharmacy in Habibganj with an attached NABL-accredited sample collection centre. Free home sample pickup for lab tests within 5 km.',
    category: 'healthcare',
    subCategory: 'pharmacy',
    tags: ['pharmacy', 'medicine', 'blood-test', 'diagnostics', '24x7', 'home-collection'],
    phone: '9826111111',
    whatsapp: '9826111111',
    coordinates: [77.4364, 23.2273],
    address: 'Near Habibganj Station Road',
    landmark: 'Habibganj',
    pincode: '462024',
    hours: {
      timezone: 'Asia/Kolkata',
      schedule: {
        monday: { open: '00:00', close: '23:59', isOpen: true },
        tuesday: { open: '00:00', close: '23:59', isOpen: true },
        wednesday: { open: '00:00', close: '23:59', isOpen: true },
        thursday: { open: '00:00', close: '23:59', isOpen: true },
        friday: { open: '00:00', close: '23:59', isOpen: true },
        saturday: { open: '00:00', close: '23:59', isOpen: true },
        sunday: { open: '00:00', close: '23:59', isOpen: true },
      },
      specialHours: [],
    },
    items: [
      { name: 'Complete Blood Count (CBC)', price: 350, comparePrice: 450, unit: 'per test', category: 'Lab Tests' },
      { name: 'Lipid Profile', price: 700, unit: 'per test', category: 'Lab Tests' },
      { name: 'Thyroid Profile (T3 T4 TSH)', price: 550, unit: 'per test', category: 'Lab Tests' },
      { name: 'Blood Sugar (Fasting)', price: 120, unit: 'per test', category: 'Lab Tests' },
      { name: 'Vitamin D Test', price: 1200, comparePrice: 1600, unit: 'per test', category: 'Lab Tests' },
      { name: 'Home Sample Collection', price: 0, unit: 'within 5 km', category: 'Services' },
    ],
    offers: [
      {
        title: '15% off on full body checkup',
        description: 'Package includes 60+ parameters.',
        discountType: 'percentage',
        discountValue: 15,
        code: 'HEALTH15',
      },
    ],
    features: { hasDelivery: true, hasBooking: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, isWheelchairAccessible: true, hasOnlinePayment: true },
    verification: 'verified',
    seedRating: { average: 4.3, total: 214 },
    views: 6180,
  },
  {
    name: 'QuickFix Home Services',
    description:
      'Verified plumbers, electricians and cleaners covering all of Bhopal. Transparent per-visit pricing, background-checked technicians and a 30-day workmanship guarantee.',
    category: 'home-services',
    subCategory: 'plumbing',
    tags: ['plumber', 'electrician', 'cleaning', 'repair', 'ac-service', 'carpenter'],
    phone: '9826112212',
    whatsapp: '9826112212',
    coordinates: [77.4067, 23.2145],
    address: 'Office 5, Char Imli',
    landmark: 'Char Imli',
    pincode: '462016',
    hours: standardHours('08:00', '20:00'),
    items: [
      { name: 'Plumber Visit', price: 299, unit: 'per visit', category: 'Plumbing' },
      { name: 'Tap / Mixer Replacement', price: 450, unit: 'per unit', category: 'Plumbing' },
      { name: 'Electrician Visit', price: 299, unit: 'per visit', category: 'Electrical' },
      { name: 'Fan Installation', price: 350, unit: 'per unit', category: 'Electrical' },
      { name: 'AC Service (Split)', price: 599, comparePrice: 799, unit: 'per unit', category: 'Appliance' },
      { name: 'Deep Home Cleaning 2BHK', price: 3499, comparePrice: 4200, unit: 'per service', category: 'Cleaning' },
      { name: 'Pest Control', price: 1800, unit: 'per service', category: 'Cleaning' },
    ],
    offers: [
      {
        title: '₹150 off first booking',
        discountType: 'fixed',
        discountValue: 150,
        code: 'QUICK150',
        minOrderValue: 499,
      },
    ],
    features: { hasBooking: true, hasOnlinePayment: true, acceptsUPI: true, acceptsCash: true, acceptsCard: true },
    verification: 'pending',
    seedRating: { average: 4.1, total: 67 },
    views: 1980,
  },
  {
    name: 'Rajwada Ethnic Wear',
    description:
      'Family-run ethnic wear store in Chowk Bazaar stocking sarees, lehengas, sherwanis and kurta sets. In-house tailoring with 3-day alteration turnaround.',
    category: 'fashion',
    subCategory: 'womenswear',
    tags: ['saree', 'lehenga', 'kurta', 'ethnic', 'tailor', 'wedding'],
    phone: '9826113313',
    coordinates: [77.4001, 23.2601],
    address: '44, Chowk Bazaar, Old Bhopal',
    landmark: 'Chowk Bazaar',
    pincode: '462001',
    hours: standardHours('11:00', '20:30', true),
    items: [
      { name: 'Cotton Saree', price: 1200, comparePrice: 1800, unit: 'per piece', category: 'Sarees' },
      { name: 'Silk Saree', price: 4500, unit: 'per piece', category: 'Sarees' },
      { name: 'Bridal Lehenga', price: 18000, comparePrice: 25000, unit: 'per piece', category: 'Bridal' },
      { name: 'Kurta Set (Men)', price: 1600, unit: 'per set', category: 'Menswear' },
      { name: 'Sherwani', price: 8500, unit: 'per piece', category: 'Menswear' },
      { name: 'Blouse Stitching', price: 450, unit: 'per piece', category: 'Tailoring' },
      { name: 'Saree Fall & Pico', price: 120, unit: 'per saree', category: 'Tailoring' },
    ],
    offers: [
      {
        title: 'Wedding season — 25% off on lehengas',
        discountType: 'percentage',
        discountValue: 25,
        code: 'SHAADI25',
        minOrderValue: 5000,
      },
    ],
    features: { acceptsCard: true, acceptsUPI: true, acceptsCash: true, hasParking: false },
    verification: 'verified',
    seedRating: { average: 4.2, total: 89 },
    views: 2340,
  },
  {
    name: 'Bake & Brew Patisserie',
    description:
      'Artisanal bakery in Arera Colony making sourdough, custom celebration cakes and European pastries. Pre-order cakes 24 hours in advance.',
    category: 'restaurants',
    subCategory: 'bakery',
    tags: ['bakery', 'cake', 'pastry', 'sourdough', 'birthday-cake', 'coffee'],
    phone: '9826114414',
    whatsapp: '9826114414',
    coordinates: [77.4231, 23.2119],
    address: 'E-5/12, Arera Colony',
    landmark: 'Arera Colony',
    pincode: '462016',
    hours: standardHours('09:00', '21:30'),
    items: [
      { name: 'Chocolate Truffle Cake', price: 650, comparePrice: 750, unit: 'per 500 g', category: 'Cakes' },
      { name: 'Red Velvet Cake', price: 750, unit: 'per 500 g', category: 'Cakes' },
      { name: 'Sourdough Loaf', price: 220, unit: 'per loaf', category: 'Breads' },
      { name: 'Brown Bread', price: 50, unit: '400 g', category: 'Breads' },
      { name: 'Croissant', price: 90, unit: 'per piece', category: 'Pastries' },
      { name: 'Cappuccino', price: 120, unit: 'regular', category: 'Beverages' },
      { name: 'Chocolate Brownie with Ice Cream', price: 180, unit: 'single', category: 'Desserts' },
    ],
    offers: [
      {
        title: '10% off on pre-ordered cakes',
        description: 'Order at least 24 hours in advance.',
        discountType: 'percentage',
        discountValue: 10,
        code: 'PREORDER10',
      },
    ],
    features: { hasDelivery: true, hasOnlinePayment: true, acceptsCard: true, acceptsUPI: true, acceptsCash: true, hasParking: true },
    verification: 'verified',
    seedRating: { average: 4.6, total: 176 },
    views: 4870,
  },
];

export const REVIEW_TEMPLATES = [
  { rating: 5, title: 'Excellent service', comment: 'Really impressed with the quality and the staff was very polite. Prices listed here matched exactly what I paid.' },
  { rating: 4, title: 'Good value for money', comment: 'Decent experience overall. Slightly crowded on weekends but worth the wait.' },
  { rating: 5, title: 'Highly recommended', comment: 'Been coming here for months. Consistent quality and fair pricing. The offers on SHOPZY are genuine.' },
  { rating: 3, title: 'Average experience', comment: 'It was okay. Nothing exceptional but nothing bad either. Could improve on waiting time.' },
  { rating: 4, title: 'Clean and professional', comment: 'Well maintained place, staff knows their work. Parking can be a challenge in the evening.' },
  { rating: 5, title: 'Best in the area', comment: 'Compared prices with three other places nearby using this app and this one was the most reasonable.' },
  { rating: 4, title: 'Will visit again', comment: 'Happy with the service. Accepts UPI which is convenient. Slightly premium pricing but justified.' },
  { rating: 2, title: 'Needs improvement', comment: 'Service was slow on my visit and one item was unavailable despite being listed. Hope they update it.' },
];

export const CUSTOMER_NAMES = [
  ['Aditya', 'Sharma'],
  ['Priya', 'Verma'],
  ['Rahul', 'Jain'],
  ['Sneha', 'Patel'],
  ['Karan', 'Malviya'],
  ['Ananya', 'Tiwari'],
  ['Vikram', 'Singh'],
  ['Neha', 'Agrawal'],
  ['Rohit', 'Yadav'],
  ['Ishita', 'Chouhan'],
  ['Manish', 'Rathore'],
  ['Pooja', 'Dubey'],
];
