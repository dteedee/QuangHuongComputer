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

/**
 * Facebook Pixel bootstrap as plain bundled code. It used to be injected as an INLINE `<script>`
 * via innerHTML (with the pixel id interpolated into the source), which a CSP without
 * 'unsafe-inline' blocks — and which was itself a script-injection sink. Same queue-stub semantics
 * as Facebook's snippet: calls made before fbevents.js loads are queued and replayed by it.
 */
type FbqStub = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: FbqStub;
  loaded: boolean;
  version: string;
};

export function initFBPixel(pixelId: string) {
  if (!pixelId || typeof window === 'undefined') return;
  const w = window as unknown as { fbq?: FbqStub; _fbq?: FbqStub };
  if (w.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as FbqStub;
  fbq.queue = [];
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = '2.0';
  w.fbq = fbq;
  if (!w._fbq) w._fbq = fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);
  fbq('init', pixelId);
  fbq('track', 'PageView');
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
