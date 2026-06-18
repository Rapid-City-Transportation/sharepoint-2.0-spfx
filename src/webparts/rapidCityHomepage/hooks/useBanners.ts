import * as React from 'react';
import { fetchBanners } from '../services/bannersService';
import { IBannerSlide } from '../components/BannerCarousel/BannerCarousel';

/**
 * Loads homepage banner slides from the Home Banners list. On any error (list
 * missing, no access, wrong site) it returns an empty array so the carousel
 * falls back to its built-in slides and never renders blank.
 */
export function useBanners(): { banners: IBannerSlide[]; loading: boolean } {
  const [banners, setBanners] = React.useState<IBannerSlide[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchBanners()
      .then(items => {
        if (!cancelled) setBanners(items);
      })
      .catch(() => {
        if (!cancelled) setBanners([]);
      })
      .then(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return { banners, loading };
}
