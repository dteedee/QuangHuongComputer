import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { systemConfigApi, type ConfigEntry } from '../api/systemConfig';

interface SystemConfigContextValue {
  configs: ConfigEntry[];
  getValue: (key: string, fallback?: string) => string;
  isLoading: boolean;
}

const SystemConfigContext = createContext<SystemConfigContextValue | undefined>(undefined);

export const SystemConfigProvider = ({ children }: { children: ReactNode }) => {
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const loadConfigs = async () => {
      try {
        setIsLoading(true);
        const data = await systemConfigApi.getConfigs();
        setConfigs(Array.isArray(data) ? data : data ?? []);
      } catch (error) {
        console.error('Failed to load system configs', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfigs();
  }, []);

  const getValue = (key: string, fallback = ''): string => {
    const entry = configs.find((c) => c.key === key);
    return entry?.value ?? fallback;
  };

  return (
    <SystemConfigContext.Provider value={{ configs, getValue, isLoading }}>
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

