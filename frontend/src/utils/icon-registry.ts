import React from 'react';
import {
    LayoutDashboard, Package, Receipt, Wrench, ShieldCheck, Box, BarChart3,
    Users, Settings, Lock, Archive, Store, Hammer, Bell, Menu, Search,
    Power, FileText, Target, UserPlus, Mail, Zap, Ticket,
    CreditCard, Wallet, Calculator, UserCheck, Briefcase, ClipboardList,
    Activity, Tag, TrendingUp, TrendingDown, Sparkles, Star, ShoppingCart,
    Building2, RefreshCw, LayoutList, Home, Globe, Image, Video,
    MessageSquare, Heart, Bookmark, Share2, Download, Upload, Edit,
    Trash2, Plus, Minus, Check, X, AlertCircle, AlertTriangle, Info,
    ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight,
    Filter, SortAsc, SortDesc, Grid, List, Eye, EyeOff, Copy, Link,
    Calendar, Clock, MapPin, Phone, Smartphone, Monitor, Tablet, Laptop,
    Cpu, HardDrive, Database, Server, Cloud, Wifi, Bluetooth,
    Battery, Plug, Headphones, Speaker, Camera, Printer,
    Key, Shield, UserCog, UsersRound,
    Percent, DollarSign, Banknote, Coins,
    PieChart, LineChart, BarChart,
    Package2, PackageCheck, PackageX, PackageOpen, Boxes,
    type LucideIcon,
} from 'lucide-react';

// Comprehensive icon name → Lucide component map
const iconMap: Record<string, LucideIcon> = {
    // Core UI
    LayoutDashboard,
    Home,
    Settings,
    Menu,
    Search,
    Bell,
    // Data / content
    FileText,
    Package,
    Package2,
    PackageCheck,
    PackageX,
    PackageOpen,
    Boxes,
    Box,
    Archive,
    // Commerce
    Receipt,
    Store,
    ShoppingCart,
    Ticket,
    Percent,
    DollarSign,
    CreditCard,
    Wallet,
    Calculator,
    Banknote,
    Coins,
    Tag,
    // Users / HR
    Users,
    UsersRound,
    UserPlus,
    UserCheck,
    UserCog,
    Briefcase,
    ClipboardList,
    Target,
    // Tech / Repair
    Wrench,
    Hammer,
    ShieldCheck,
    Shield,
    Activity,
    // Logistics
    Building2,
    // Communication
    Mail,
    MessageSquare,
    Phone,
    Smartphone,
    Globe,
    // Analytics
    BarChart3,
    BarChart,
    LineChart,
    PieChart,
    TrendingUp,
    TrendingDown,
    // Actions
    RefreshCw,
    Power,
    Download,
    Upload,
    Copy,
    Link,
    Edit,
    Trash2,
    Plus,
    Minus,
    Check,
    X,
    Eye,
    EyeOff,
    // Status / alert
    AlertCircle,
    AlertTriangle,
    Info,
    // Navigation
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    ArrowLeft,
    ArrowRight,
    // Sorting / filtering
    Filter,
    SortAsc,
    SortDesc,
    Grid,
    List,
    LayoutList,
    // Media
    Image,
    Video,
    Camera,
    // Time / location
    Calendar,
    Clock,
    MapPin,
    // Hardware
    Monitor,
    Tablet,
    Laptop,
    Cpu,
    HardDrive,
    Database,
    Server,
    Cloud,
    Wifi,
    Bluetooth,
    Battery,
    Plug,
    Headphones,
    Speaker,
    Printer,
    // Security
    Lock,
    Key,
    // Content / marketing
    Sparkles,
    Star,
    Heart,
    Bookmark,
    Share2,
    Zap,
};

/**
 * Single icon stroke weight for the whole app (design-direction.md §9.7).
 * Lucide's default is 2 and reads heavy next to Inter at 13–14px.
 */
export const ICON_STROKE = 1.75;

/**
 * Resolves a Lucide icon name string to a rendered React element.
 * Falls back to the Box icon when the name is not in the registry.
 *
 * This registry is the ONLY sanctioned way to turn a stored icon name into an
 * icon. Never `import * as icons from 'lucide-react'` — that pulls the whole
 * set (~1400 components) into the bundle.
 */
export const getIcon = (
    name: string | null | undefined,
    size = 20,
    className?: string,
): React.ReactElement => {
    const Icon = (name ? iconMap[name] : null) ?? Box;
    return React.createElement(Icon, { size, className, strokeWidth: ICON_STROKE });
};

/**
 * Resolves a name to the component itself, for call sites that need to pass
 * their own props (`const Icon = getIconComponent(row.icon)`).
 */
export const getIconComponent = (name: string | null | undefined): LucideIcon =>
    (name ? iconMap[name] : null) ?? Box;

/** True when the name is known — use to validate admin input before saving. */
export const isKnownIcon = (name: string | null | undefined): boolean =>
    !!name && name in iconMap;

/**
 * All valid icon names — used for icon picker dropdowns in editors.
 */
export const iconNames = Object.keys(iconMap).sort();
