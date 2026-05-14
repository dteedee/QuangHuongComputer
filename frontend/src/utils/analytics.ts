export function initGA4(measurementId: string) {
  if (!measurementId || typeof window === 'undefined') return;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
  (window as any).dataLayer = (window as any).dataLayer || [];
  function gtag(...args: any[]) { (window as any).dataLayer.push(args); }
  gtag('js', new Date());
  gtag('config', measurementId);
  (window as any).gtag = gtag;
}

export function initFBPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return;
  const script = document.createElement('script');
  script.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
  document.head.appendChild(script);
}

export function trackPageView(path: string) {
  if ((window as any).gtag) (window as any).gtag('event', 'page_view', { page_path: path });
  if ((window as any).fbq) (window as any).fbq('track', 'PageView');
}

export function trackEvent(name: string, params?: Record<string, any>) {
  if ((window as any).gtag) (window as any).gtag('event', name, params);
}

export function trackEcommerce(
  type: 'view_item' | 'add_to_cart' | 'begin_checkout' | 'purchase',
  data: { value?: number; currency?: string; items?: any[] }
) {
  if ((window as any).gtag) (window as any).gtag('event', type, { ...data, currency: data.currency || 'VND' });
  const fbMap: Record<string, string> = {
    view_item: 'ViewContent',
    add_to_cart: 'AddToCart',
    begin_checkout: 'InitiateCheckout',
    purchase: 'Purchase'
  };
  if ((window as any).fbq && fbMap[type]) (window as any).fbq('track', fbMap[type], { value: data.value, currency: 'VND' });
}
