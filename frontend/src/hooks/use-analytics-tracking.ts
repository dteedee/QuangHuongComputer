import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initGA4, initFBPixel, trackPageView } from '../utils/analytics';

export function useAnalyticsTracking() {
  const location = useLocation();

  useEffect(() => {
    const ga4Id = import.meta.env.VITE_GA4_ID;
    const fbPixelId = import.meta.env.VITE_FB_PIXEL_ID;
    if (ga4Id) initGA4(ga4Id);
    if (fbPixelId) initFBPixel(fbPixelId);
  }, []);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);
}
