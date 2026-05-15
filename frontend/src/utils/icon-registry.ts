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
 * Resolves a Lucide icon name string to a rendered React element.
 * Falls back to Box icon if name not found in registry.
 */
export const getIcon = (name: string | null | undefined, size = 20): React.ReactElement => {
    const Icon = name ? iconMap[name] : null;
    if (!Icon) return React.createElement(Box, { size });
    return React.createElement(Icon, { size });
};

/**
 * All valid icon names — used for icon picker dropdowns in editors.
 */
export const iconNames = Object.keys(iconMap).sort();
