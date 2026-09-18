import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { getConfigValue, configParsers, type ConfigurationEntry } from '../api/systemConfig';
import { usePublicConfig } from '../lib/use-public-config';

interface SystemConfigContextValue {
  configs: ConfigurationEntry[];
  getValue: (key: string, fallback?: string) => string;
  getNumber: (key: string, fallback?: number) => number;
  getBoolean: (key: string, fallback?: boolean) => boolean;
  getJson: <T>(key: string, fallback: T) => T;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const SystemConfigContext = createContext<SystemConfigContextValue | undefined>(undefined);

export const SystemConfigProvider = ({ children }: { children: ReactNode }) => {
  // Shares the single `/api/config/public` request with every other
  // `usePublicConfig()` consumer (ThemeContext, useCompanyInfo, ...) instead
  // of firing its own — this used to be a second, independent fetch.
  const { data, isLoading, refetch } = usePublicConfig();
  const configs = data ?? [];

  const getValue = (key: string, fallback = ''): string => {
    return getConfigValue(configs, key, fallback, configParsers.string);
  };

  const getNumber = (key: string, fallback = 0): number => {
    return getConfigValue(configs, key, fallback, configParsers.number);
  };

  const getBoolean = (key: string, fallback = false): boolean => {
    return getConfigValue(configs, key, fallback, configParsers.boolean);
  };

  const getJson = <T,>(key: string, fallback: T): T => {
    // configParsers.json là hàm generic; phải chỉ định T rõ ràng, nếu không TS suy ra `unknown`.
    return getConfigValue(configs, key, fallback, configParsers.json<T>);
  };

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return (
    <SystemConfigContext.Provider value={{
      configs,
      getValue,
      getNumber,
      getBoolean,
      getJson,
      isLoading,
      refresh
    }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => {
  const ctx = useContext(SystemConfigContext);
  if (!ctx) {
    throw new Error('useSystemConfig must be used within SystemConfigProvider');
  }
  return ctx;
};
