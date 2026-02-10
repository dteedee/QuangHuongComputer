import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { systemConfigApi, type ConfigurationEntry, getConfigValue, configParsers } from '../api/systemConfig';

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
  const [configs, setConfigs] = useState<ConfigurationEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadConfigs = useCallback(async () => {
    try {
      setIsLoading(true);
      // Use public endpoint which doesn't require admin role
      const data = await systemConfigApi.config.getPublic();
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load system configs', error);
      // Fallback to empty if failed
      setConfigs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

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
    return getConfigValue(configs, key, fallback, configParsers.json);
  };

  return (
    <SystemConfigContext.Provider value={{
      configs,
      getValue,
      getNumber,
      getBoolean,
      getJson,
      isLoading,
      refresh: loadConfigs
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

