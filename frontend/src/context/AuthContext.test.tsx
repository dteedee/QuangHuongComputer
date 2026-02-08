import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as apiMocks from '../api/auth';

// Mock API
vi.mock('../api/auth', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
}));

describe('AuthContext Integration Tests', () => {
  const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    roles: ['Admin'],
  };

  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('useAuth Hook', () => {
    it('provides authentication context', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBeDefined();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });

    it('throws error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth());
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Login Flow', () => {
    it('successfully logs in user', async () => {
      const loginMock = vi.mocked(apiMocks).login as any;
      loginMock.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('stores tokens in localStorage after login', async () => {
      const loginMock = vi.mocked(apiMocks).login as any;
      loginMock.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(localStorage.getItem('accessToken')).toBe(mockTokens.accessToken);
      expect(localStorage.getItem('refreshToken')).toBe(mockTokens.refreshToken);
    });

    it('handles login failure', async () => {
      const loginMock = vi.mocked(apiMocks).login as any;
      loginMock.mockRejectedValue(new Error('Invalid credentials'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong-password');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Logout Flow', () => {
    it('successfully logs out user', async () => {
      // Setup: User is logged in
      localStorage.setItem('accessToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate logged in state
      await act(async () => {
        result.current.setUser(mockUser);
        result.current.setIsAuthenticated(true);
      });

      // Logout
      await act(async () => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('Registration Flow', () => {
    it('successfully registers new user', async () => {
      const registerMock = vi.mocked(apiMocks).register as any;
      registerMock.mockResolvedValue({ user: mockUser, tokens: mockTokens });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
        });
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);
    });

    it('handles registration failure', async () => {
      const registerMock = vi.mocked(apiMocks).register as any;
      registerMock.mockRejectedValue(new Error('Email already exists'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.register({
            name: 'Test User',
            email: 'existing@example.com',
            password: 'password123',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
        }
      });

      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Token Refresh', () => {
    it('refreshes access token', async () => {
      const newTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.refreshAccessToken(newTokens);
      });

      expect(localStorage.getItem('accessToken')).toBe(newTokens.accessToken);
    });
  });

  describe('Role-based Access', () => {
    it('checks if user has specific role', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        result.current.setUser(mockUser);
      });

      expect(result.current.hasRole('Admin')).toBe(true);
      expect(result.current.hasRole('Manager')).toBe(false);
    });

    it('checks if user has any of specified roles', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        result.current.setUser(mockUser);
      });

      expect(result.current.hasAnyRole(['Admin', 'Manager'])).toBe(true);
      expect(result.current.hasAnyRole(['Manager', 'Sale'])).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('restores user session from localStorage', async () => {
      localStorage.setItem('accessToken', mockTokens.accessToken);
      localStorage.setItem('refreshToken', mockTokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockUser));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user).toEqual(mockUser);
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during login', async () => {
      const loginMock = vi.mocked(apiMocks).login as any;
      loginMock.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ user: mockUser, tokens: mockTokens }), 100))
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      act(() => {
        result.current.login('test@example.com', 'password123');
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const loginMock = vi.mocked(apiMocks).login as any;
      loginMock.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'password123');
        } catch (error) {
          expect(result.current.error).toBeInstanceOf(Error);
        }
      });
    });
  });
});
