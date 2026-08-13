import React from 'react';
import {
  Wallet,
  Briefcase,
  Home,
  Shield,
  Car,
  HeartPulse,
  ShoppingBag,
  Utensils,
  GraduationCap,
  DollarSign,
  PiggyBank,
  Landmark,
  CreditCard,
  Flame,
  Zap,
  Wifi,
  Smartphone,
  Layers,
  Tag,
  Bus,
  Plane,
  Gift,
  Wrench,
  Stethoscope,
  Film,
  BookOpen,
  Sparkles,
  Building,
  TrendingUp,
  Receipt,
  User,
  HelpCircle,
  LucideProps,
} from 'lucide-react';

export const CATEGORY_ICON_LIST = [
  { id: 'Wallet', name: 'Wallet', icon: Wallet },
  { id: 'Briefcase', name: 'Salary / Work', icon: Briefcase },
  { id: 'DollarSign', name: 'Money', icon: DollarSign },
  { id: 'PiggyBank', name: 'Savings', icon: PiggyBank },
  { id: 'Landmark', name: 'Bank', icon: Landmark },
  { id: 'Home', name: 'Housing / Rent', icon: Home },
  { id: 'Utensils', name: 'Food & Dining', icon: Utensils },
  { id: 'ShoppingBag', name: 'Shopping', icon: ShoppingBag },
  { id: 'Car', name: 'Vehicle', icon: Car },
  { id: 'Bus', name: 'Transport', icon: Bus },
  { id: 'Plane', name: 'Travel', icon: Plane },
  { id: 'HeartPulse', name: 'Health', icon: HeartPulse },
  { id: 'Stethoscope', name: 'Medical', icon: Stethoscope },
  { id: 'GraduationCap', name: 'Education', icon: GraduationCap },
  { id: 'BookOpen', name: 'Books', icon: BookOpen },
  { id: 'Flame', name: 'Utilities / Gas', icon: Flame },
  { id: 'Zap', name: 'Electricity', icon: Zap },
  { id: 'Wifi', name: 'Internet / Wifi', icon: Wifi },
  { id: 'Smartphone', name: 'Mobile / Recharge', icon: Smartphone },
  { id: 'CreditCard', name: 'Cards / Debt', icon: CreditCard },
  { id: 'Shield', name: 'Insurance / Asset', icon: Shield },
  { id: 'Gift', name: 'Gift / Donation', icon: Gift },
  { id: 'Wrench', name: 'Maintenance', icon: Wrench },
  { id: 'Film', name: 'Entertainment', icon: Film },
  { id: 'Building', name: 'Property', icon: Building },
  { id: 'TrendingUp', name: 'Investment', icon: TrendingUp },
  { id: 'Receipt', name: 'Bills', icon: Receipt },
  { id: 'Sparkles', name: 'Other / Misc', icon: Sparkles },
];

export const CategoryIcon: React.FC<{ name?: string; className?: string }> = ({
  name,
  className = 'w-4 h-4',
}) => {
  const found = CATEGORY_ICON_LIST.find((i) => i.id === name);
  if (found) {
    const Component = found.icon;
    return <Component className={className} />;
  }
  return <Tag className={className} />;
};
