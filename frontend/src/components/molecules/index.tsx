import React from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Badge, Card } from '../atoms';

// ================================================
// PRODUCT CARD - Molecule Component
// ================================================

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  badge?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  onAddToCart?: (id: string) => void;
  onQuickView?: (id: string) => void;
  onClick?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  image,
  badge,
  rating,
  reviewCount,
  inStock = true,
  onAddToCart,
  onQuickView,
  onClick,
}) => {
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0;

  return (
    <Card
      variant="elevated"
      padding="none"
      hoverable
      onClick={onClick}
      className="group overflow-hidden"
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-neutral-100 aspect-square">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {!inStock && <Badge variant="error">Hết hàng</Badge>}
          {badge && <Badge variant="warning">{badge}</Badge>}
          {discount > 0 && <Badge variant="error">-{discount}%</Badge>}
        </div>

        {/* Quick Actions - Show on hover */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onQuickView?.(id);
            }}
          >
            Xem nhanh
          </Button>
          {inStock && onAddToCart && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(id);
              }}
            >
              Thêm vào giỏ
            </Button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3 className="font-semibold text-neutral-900 line-clamp-2 mb-2 min-h-[3rem]">
          {name}
        </h3>

        {/* Rating */}
        {rating !== undefined && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-4 h-4 ${
                    star <= rating ? 'text-warning-500' : 'text-neutral-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            {reviewCount && (
              <span className="text-sm text-neutral-500">({reviewCount})</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary-500">
            {price.toLocaleString('vi-VN')}₫
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-sm text-neutral-400 line-through">
              {originalPrice.toLocaleString('vi-VN')}₫
            </span>
          )}
        </div>
      </div>
    </Card>
  );
};

// ================================================
// STAT CARD - Dashboard Statistics
// ================================================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  trend,
  color = 'primary',
}) => {
  const colorStyles = {
    primary: 'bg-primary-50 text-primary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
    info: 'bg-secondary-50 text-secondary-600',
  };

  return (
    <Card variant="elevated" padding="lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-neutral-600 mb-1">{title}</p>
          <motion.p
            className="text-3xl font-bold text-neutral-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {value}
          </motion.p>

          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={`text-sm font-medium ${
                  trend === 'up' ? 'text-success-600' : 'text-error-600'
                }`}
              >
                {trend === 'up' ? '↑' : '↓'} {Math.abs(change)}%
              </span>
              <span className="text-sm text-neutral-500">so với tháng trước</span>
            </div>
          )}
        </div>

        {icon && (
          <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

// ================================================
// SEARCH BAR - Enhanced Search
// ================================================

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  suggestions?: string[];
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Tìm kiếm sản phẩm...',
  onSearch,
  suggestions = [],
  isLoading = false,
}) => {
  const [query, setQuery] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(query);
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <form onSubmit={handleSearch}>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          placeholder={placeholder}
          leftIcon={
            isLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            )
          }
          rightIcon={
            query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setShowSuggestions(false);
                }}
                className="hover:text-neutral-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )
          }
        />
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute z-50 w-full mt-2 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => {
                setQuery(suggestion);
                onSearch?.(suggestion);
                setShowSuggestions(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-neutral-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-neutral-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span className="text-sm">{suggestion}</span>
              </div>
            </button>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ================================================
// NOTIFICATION ITEM
// ================================================

interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  time: string;
  isRead?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClick?: (id: string) => void;
  onMarkAsRead?: (id: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  title,
  message,
  time,
  isRead = false,
  type = 'info',
  onClick,
  onMarkAsRead,
}) => {
  const typeColors = {
    info: 'bg-secondary-50 text-secondary-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  };

  const typeIcons = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    ),
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        flex gap-3 p-4 rounded-lg cursor-pointer transition-all
        ${isRead ? 'bg-white hover:bg-neutral-50' : 'bg-primary-50 hover:bg-primary-100'}
      `}
      onClick={() => onClick?.(id)}
    >
      <div className={`flex-shrink-0 p-2 rounded-lg ${typeColors[type]}`}>
        {typeIcons[type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={`font-semibold ${isRead ? 'text-neutral-700' : 'text-neutral-900'}`}>
            {title}
          </h4>
          {!isRead && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary-500" />
          )}
        </div>
        <p className="text-sm text-neutral-600 mt-1 line-clamp-2">{message}</p>
        <p className="text-xs text-neutral-400 mt-1">{time}</p>
      </div>

      {!isRead && onMarkAsRead && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onMarkAsRead(id);
          }}
          className="flex-shrink-0 text-primary-500 hover:text-primary-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
      )}
    </motion.div>
  );
};
