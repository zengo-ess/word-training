import {
  Home,
  Layers,
  Plus,
  BarChart3,
  Settings,
  Sparkles,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Flame,
  Search,
  Lock,
  Trophy,
  Target,
  Clock,
  Calendar,
  RefreshCw,
  BookOpen,
  Star,
  Globe,
  HelpCircle,
  Trash2,
  Pencil,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  home: Home,
  layers: Layers,
  plus: Plus,
  chart: BarChart3,
  settings: Settings,
  sparkles: Sparkles,
  check: Check,
  x: X,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "volume-2": Volume2,
  flame: Flame,
  search: Search,
  lock: Lock,
  trophy: Trophy,
  target: Target,
  clock: Clock,
  calendar: Calendar,
  refresh: RefreshCw,
  book: BookOpen,
  star: Star,
  globe: Globe,
  trash: Trash2,
  edit: Pencil,
};

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  color?: string;
}

export function Icon({ name, size = 22, stroke = 2.2, color = "currentColor" }: IconProps) {
  const Cmp = MAP[name] ?? HelpCircle;
  return <Cmp size={size} strokeWidth={stroke} color={color} />;
}
