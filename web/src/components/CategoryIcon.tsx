import {
  Activity,
  Apple,
  Cake,
  ChefHat,
  Coffee,
  Droplet,
  Dumbbell,
  Flower,
  Flower2,
  Footprints,
  Laptop,
  Pill,
  Scissors,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Shirt,
  Smartphone,
  Smile,
  Sparkles,
  SprayCan,
  Stethoscope,
  Store,
  TestTube,
  Utensils,
  UtensilsCrossed,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Categories store a lucide icon *name* in the database, so the component has
 * to resolve a string to a component. Importing the whole `lucide-react`
 * namespace to do that would pull every icon into the bundle (~700 kB), so we
 * register only the icons the catalogue actually uses.
 */
const ICONS: Record<string, LucideIcon> = {
  Activity,
  Apple,
  Cake,
  ChefHat,
  Coffee,
  Droplet,
  Dumbbell,
  Flower,
  Flower2,
  Footprints,
  Laptop,
  Pill,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  ShoppingCart,
  Smartphone,
  Smile,
  Sparkles,
  SprayCan,
  Stethoscope,
  Store,
  TestTube,
  Utensils,
  UtensilsCrossed,
  Wrench,
  Zap,
};

// Aliases and case-insensitive/kebab-case fallback mappings
const ALIASES: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  utensilscrossed: UtensilsCrossed,
  restaurant: UtensilsCrossed,
  restaurants: UtensilsCrossed,
  food: UtensilsCrossed,
  cafe: Coffee,
  bakery: Cake,
  'shopping-bag': ShoppingBag,
  shoppingbag: ShoppingBag,
  'shopping-basket': ShoppingBasket,
  shoppingbasket: ShoppingBasket,
  'shopping-cart': ShoppingCart,
  shoppingcart: ShoppingCart,
  grocery: ShoppingBag,
  kirana: ShoppingBag,
  scissors: Scissors,
  salons: Scissors,
  salon: Scissors,
  spa: Flower2,
  dumbbell: Dumbbell,
  gym: Dumbbell,
  gyms: Dumbbell,
  fitness: Dumbbell,
  laptop: Laptop,
  electronics: Laptop,
  tech: Laptop,
  stethoscope: Stethoscope,
  health: Stethoscope,
  healthcare: Stethoscope,
  pharmacy: Pill,
  pill: Pill,
  wrench: Wrench,
  repair: Wrench,
  'home-services': Wrench,
  homeservices: Wrench,
  shirt: Shirt,
  fashion: Shirt,
  apparel: Shirt,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  if (!name) return <Store className={className} aria-hidden />;

  const rawLower = name.toLowerCase().trim();
  const normalized = rawLower.replace(/[-_\s]/g, '');

  const Icon = ICONS[name] ?? ALIASES[rawLower] ?? ALIASES[normalized] ?? Store;
  return <Icon className={className} aria-hidden />;
}
