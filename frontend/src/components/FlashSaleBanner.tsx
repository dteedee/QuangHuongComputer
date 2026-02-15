import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ChevronRight, ShoppingBag, Flame } from 'lucide-react';
import FlashSaleCountdown from './FlashSaleCountdown';
import { contentApi, type FlashSale } from '../api/content';

interface FlashSaleBannerProps {
  className?: string;
  variant?: 'hero' | 'sidebar' | 'mini';
}

export default function FlashSaleBanner({
  className = '',
  variant = 'hero',
}: FlashSaleBannerProps) {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlashSales();
  }, []);

  // Auto rotate through flash sales
  useEffect(() => {
    if (flashSales.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % flashSales.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [flashSales.length]);

  const loadFlashSales = async () => {
    try {
      const data = await contentApi.flashSales.getActive();
      setFlashSales(data);
    } catch (error) {
      console.error('Failed to load flash sales:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl h-48 ${className}`} />
    );
  }

  if (flashSales.length === 0) {
    return null;
  }

  const currentSale = flashSales[currentIndex];

  if (variant === 'mini') {
    return (
      <Link
        to={`/flash-sales/${currentSale.id}`}
        className={`block bg-gradient-to-r from-[#D70018] to-[#ff4d4d] rounded-xl p-3 hover:shadow-lg transition-all ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Flash Sale</p>
              <p className="text-white/80 text-xs">{currentSale.name}</p>
            </div>
          </div>
          <FlashSaleCountdown
            endTime={currentSale.endTime}
            variant="compact"
            showLabel={false}
            className="text-white"
          />
        </div>
      </Link>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className={`bg-gradient-to-br from-[#D70018] to-[#ff4d4d] rounded-2xl p-5 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
          </div>
          <div>
            <h3 className="text-white font-black uppercase tracking-tight">Flash Sale</h3>
            <p className="text-white/80 text-xs font-medium">Giảm đến {currentSale.discountValue}%</p>
          </div>
        </div>

        <FlashSaleCountdown
          endTime={currentSale.endTime}
          variant="large"
          showLabel={false}
          className="mb-4"
        />

        <Link
          to={`/flash-sales/${currentSale.id}`}
          className="flex items-center justify-center gap-2 w-full py-3 bg-white text-[#D70018] rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Xem ngay
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Hero variant (default)
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#D70018] via-[#ff2d2d] to-[#ff6b35] ${className}`}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full" />
      </div>

      {/* Sparks/particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <Flame
            key={i}
            className="absolute text-yellow-400/30 animate-bounce"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${12 + Math.random() * 8}px`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${2 + Math.random()}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 p-6 md:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Zap className="w-7 h-7 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <h2 className="text-white font-black text-2xl md:text-3xl uppercase tracking-tight">
                  Flash Sale
                </h2>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-300 font-bold text-sm">Giảm đến</span>
                  <span className="bg-yellow-400 text-[#D70018] font-black text-lg px-2 py-0.5 rounded">
                    {currentSale.discountType === 'Percentage'
                      ? `${currentSale.discountValue}%`
                      : `${currentSale.discountValue.toLocaleString()}đ`}
                  </span>
                </div>
              </div>
            </div>

            <h3 className="text-white font-bold text-lg md:text-xl mb-2">
              {currentSale.name}
            </h3>
            <p className="text-white/80 text-sm max-w-md">
              {currentSale.description}
            </p>

            {/* Dots indicator for multiple sales */}
            {flashSales.length > 1 && (
              <div className="flex items-center justify-center lg:justify-start gap-2 mt-4">
                {flashSales.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentIndex
                        ? 'bg-white w-6'
                        : 'bg-white/40 hover:bg-white/60'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Content - Countdown */}
          <div className="flex flex-col items-center gap-4">
            <FlashSaleCountdown
              endTime={currentSale.endTime}
              startTime={currentSale.startTime}
              variant="banner"
              onExpired={loadFlashSales}
            />

            <Link
              to={`/flash-sales/${currentSale.id}`}
              className="flex items-center gap-2 px-8 py-3 bg-white text-[#D70018] rounded-xl font-black uppercase text-sm hover:bg-yellow-50 hover:scale-105 transition-all shadow-lg"
            >
              <ShoppingBag className="w-5 h-5" />
              Mua ngay
              <ChevronRight className="w-5 h-5" />
            </Link>

            {currentSale.totalQuantityLimit && (
              <div className="text-center">
                <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (currentSale.soldQuantity / currentSale.totalQuantityLimit) * 100)}%`,
                    }}
                  />
                </div>
                <p className="text-white/80 text-xs mt-1 font-medium">
                  Đã bán {currentSale.soldQuantity}/{currentSale.totalQuantityLimit}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Badge */}
      {currentSale.badgeText && (
        <div
          className="absolute top-4 right-4 px-3 py-1 rounded-full font-black text-xs uppercase animate-pulse"
          style={{ backgroundColor: currentSale.badgeColor || '#FFD700', color: '#000' }}
        >
          {currentSale.badgeText}
        </div>
      )}
    </div>
  );
}
