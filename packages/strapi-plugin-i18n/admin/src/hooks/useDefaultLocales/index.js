import { useQuery } from 'react-query';
import { request } from 'strapi-helper-plugin';

const fetchDefaultLocalesList = async () => {
  try {
    const data = await request('/i18n/iso-locales', {
      method: 'GET',
    });

    return data;
  } catch (e) {
    if (e.name === 'AbortError') return null;

    strapi.notification.toggle({
      type: 'warning',
      message: { id: 'notification.error' },
    });

    return e;
  }
};

const useDefaultLocales = () => {
  const { isLoading, data } = useQuery('default-locales', fetchDefaultLocalesList);

  return { defaultLocales: data, isLoading };
};

export default useDefaultLocales;
