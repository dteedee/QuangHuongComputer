import { useState, useEffect } from 'react';
import { Clock, Zap } from 'lucide-react';

interface FlashSaleCountdownProps {
  endTime: string | Date;
  startTime?: string | Date;
  variant?: 'default' | 'compact' | 'large' | 'banner';
  onExpired?: () => void;
  showLabel?: boolean;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export default function FlashSaleCountdown({
  endTime,
  startTime,
  variant = 'default',
  onExpired,
  showLabel = true,
  className = '',
}: FlashSaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isUpcoming, setIsUpcoming] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const start = startTime ? new Date(startTime).getTime() : now;

      // Check if sale hasn't started yet
      if (now < start) {
        setIsUpcoming(true);
        const difference = start - now;
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
          total: difference,
        };
      }

      setIsUpcoming(false);
      const difference = end - now;

      if (difference <= 0) {
        onExpired?.();
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, startTime, onExpired]);

  if (!timeLeft) {
    return (
      <div className={`text-gray-500 text-sm font-medium ${className}`}>
        Đã kết thúc
      </div>
    );
  }

  const TimeBlock = ({ value, label }: { value: number; label: string }) => {
    if (variant === 'compact') {
      return (
        <span className="font-bold tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      );
    }

    if (variant === 'banner') {
      return (
        <div className="flex flex-col items-center">
          <div className="bg-white text-[#D70018] font-black text-2xl md:text-3xl w-14 h-14 md:w-16 md:h-16 rounded-xl flex items-center justify-center shadow-lg">
            {String(value).padStart(2, '0')}
          </div>
          <span className="text-white/90 text-[10px] md:text-xs font-bold mt-1 uppercase tracking-wider">
            {label}
          </span>
        </div>
      );
    }

    if (variant === 'large') {
      return (
        <div className="flex flex-col items-center">
          <div className="bg-[#D70018] text-white font-black text-xl md:text-2xl w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center shadow-lg">
            {String(value).padStart(2, '0')}
          </div>
          <span className="text-gray-600 text-[10px] font-bold mt-1 uppercase">
            {label}
          </span>
        </div>
      );
    }

    // Default variant
    return (
      <div className="flex flex-col items-center">
        <div className="bg-gray-900 text-white font-bold text-sm w-8 h-8 rounded-md flex items-center justify-center">
          {String(value).padStart(2, '0')}
        </div>
        <span className="text-gray-500 text-[10px] font-medium mt-0.5">
          {label}
        </span>
      </div>
    );
  };

  const Separator = () => {
    if (variant === 'compact') {
      return <span className="mx-0.5 text-gray-400">:</span>;
    }
    if (variant === 'banner') {
      return <span className="text-white font-bold text-2xl md:text-3xl mx-1 md:mx-2">:</span>;
    }
    if (variant === 'large') {
      return <span className="text-[#D70018] font-bold text-xl mx-1">:</span>;
    }
    return <span className="text-gray-400 font-bold mx-0.5">:</span>;
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1 text-[#D70018] ${className}`}>
        <Clock className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">
          {timeLeft.days > 0 && (
            <>
              <TimeBlock value={timeLeft.days} label="" />
              <span className="mx-0.5">d</span>
            </>
          )}
          <TimeBlock value={timeLeft.hours} label="" />
          <Separator />
          <TimeBlock value={timeLeft.minutes} label="" />
          <Separator />
          <TimeBlock value={timeLeft.seconds} label="" />
        </span>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`${className}`}>
        {showLabel && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-bold uppercase tracking-wider text-sm">
              {isUpcoming ? 'Bắt đầu sau' : 'Kết thúc sau'}
            </span>
            <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
          </div>
        )}
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {timeLeft.days > 0 && (
            <>
              <TimeBlock value={timeLeft.days} label="Ngày" />
              <Separator />
            </>
          )}
          <TimeBlock value={timeLeft.hours} label="Giờ" />
          <Separator />
          <TimeBlock value={timeLeft.minutes} label="Phút" />
          <Separator />
          <TimeBlock value={timeLeft.seconds} label="Giây" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {showLabel && (
        <div className="flex items-center gap-1 mb-2 text-xs text-gray-500 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>{isUpcoming ? 'Bắt đầu sau' : 'Kết thúc sau'}</span>
        </div>
      )}
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <>
            <TimeBlock value={timeLeft.days} label="Ngày" />
            <Separator />
          </>
        )}
        <TimeBlock value={timeLeft.hours} label="Giờ" />
        <Separator />
        <TimeBlock value={timeLeft.minutes} label="Phút" />
        <Separator />
        <TimeBlock value={timeLeft.seconds} label="Giây" />
      </div>
    </div>
  );
}
