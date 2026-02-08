/**
 * Animation Keyframes
 * Hiệu ứng mượt mà cho UX premium
 */

export const keyframes = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideInLeft {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 20px rgba(215, 0, 24, 0.3);
    }
    50% {
      box-shadow: 0 0 40px rgba(215, 0, 24, 0.5);
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes shake {
    0%, 100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-5px);
    }
    75% {
      transform: translateX(5px);
    }
  }

  @keyframes bounce-in {
    0% {
      opacity: 0;
      transform: scale(0.3);
    }
    50% {
      transform: scale(1.05);
    }
    70% {
      transform: scale(0.9);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }

  @keyframes marquee {
    0% {
      transform: translateX(0%);
    }
    100% {
      transform: translateX(-100%);
    }
  }

  @keyframes gradient-shift {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes bounce {
    0%, 100% {
      animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
    }
    50% {
      animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
    }
  }
`;

export const animationClasses = {
  // Fade animations
  'animate-fade-in': 'animation: fadeIn 0.3s ease-out',
  'animate-fade-in-up': 'animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  'animate-fade-in-down': 'animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  'animate-fade-in-right': 'animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  'animate-fade-in-left': 'animation: slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)',

  // Scale animations
  'animate-scale-in': 'animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
  'animate-bounce-in': 'animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',

  // Special animations
  'animate-shimmer': 'animation: shimmer 2s linear infinite',
  'animate-float': 'animation: float 3s ease-in-out infinite',
  'animate-pulse-glow': 'animation: pulseGlow 2s ease-in-out infinite',
  'animate-shake': 'animation: shake 0.4s ease-in-out',

  // Loading animations
  'animate-spin-slow': 'animation: spin 3s linear infinite',
  'animate-pulse-slow': 'animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
};

export default { keyframes, animationClasses };
