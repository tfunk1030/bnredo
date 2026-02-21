/**
 * Tests for AuthContext (AuthProvider + useAuth)
 *
 * Key logic under test:
 *   - Supabase null guard: isLoading → false immediately, all methods return early
 *   - Supabase active: getSession loads initial session, isLoading resolves
 *   - onAuthStateChange: subscription fires → session/user updated
 *   - signIn: calls signInWithPassword, returns error or null
 *   - signUp: calls signUp, returns error or null
 *   - signOut: calls supabase.auth.signOut
 *   - user derived from session.user (null when no session)
 *   - cleanup: subscription.unsubscribe called on unmount
 *
 * MOCKING:
 *   - @/src/lib/supabase — mocked with controllable supabase stub
 */

import * as React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext';

// ─── Supabase mock factory ──────────────────────────────────────────────────

const mockUnsubscribe = jest.fn();
let authStateCallback: ((event: string, session: unknown) => void) | null = null;

function makeSupabaseMock(initialSession: unknown = null) {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: initialSession } }),
      onAuthStateChange: jest.fn().mockImplementation((cb) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
      signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
      signUp: jest.fn().mockResolvedValue({ error: null }),
      signOut: jest.fn().mockResolvedValue({}),
    },
  };
}

// We need to control whether supabase is null or a mock
const supabaseModule = {
  supabase: null as unknown,
};

jest.mock('@/src/lib/supabase', () => supabaseModule);

// ─── Helpers ───────────────────────────────────────────────────────────────

const mockSession = {
  user: { id: 'user-123', email: 'taylor@golf.com' },
  access_token: 'tok_abc',
  refresh_token: 'ref_abc',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  supabaseModule.supabase = null;
  authStateCallback = null;
  mockUnsubscribe.mockClear();
});

// ═══════════════════════════════════════════════════════════════════════════
// Supabase null guard (no Supabase configured)
// ═══════════════════════════════════════════════════════════════════════════
describe('Supabase null guard — no auth configured', () => {
  beforeEach(() => {
    supabaseModule.supabase = null;
  });

  test('isLoading becomes false immediately when Supabase is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  test('session is null when Supabase is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
  });

  test('user is null when Supabase is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
  });

  test('signIn returns error when Supabase is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await act(async () =>
      result.current.signIn('test@email.com', 'password')
    );

    expect(response.error).toBe('Auth not configured');
  });

  test('signUp returns error when Supabase is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await act(async () =>
      result.current.signUp('test@email.com', 'password')
    );

    expect(response.error).toBe('Auth not configured');
  });

  test('signOut resolves without error when Supabase is null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => result.current.signOut())
    ).resolves.toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Supabase active — initial session loading
// ═══════════════════════════════════════════════════════════════════════════
describe('Supabase active — initial session', () => {
  test('loads existing session from getSession on mount', async () => {
    supabaseModule.supabase = makeSupabaseMock(mockSession);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBe(mockSession);
  });

  test('user is derived from session.user', async () => {
    supabaseModule.supabase = makeSupabaseMock(mockSession);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.user?.email).toBe('taylor@golf.com');
  });

  test('user is null when session is null', async () => {
    supabaseModule.supabase = makeSupabaseMock(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
  });

  test('isLoading starts true and resolves after getSession', async () => {
    let resolveSession: (v: unknown) => void;
    const slowSupabase = makeSupabaseMock();
    slowSupabase.auth.getSession = jest.fn().mockReturnValue(
      new Promise(r => { resolveSession = r; })
    );
    supabaseModule.supabase = slowSupabase;

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSession!({ data: { session: null } });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  test('registers onAuthStateChange subscription on mount', async () => {
    const mockSupa = makeSupabaseMock(null);
    supabaseModule.supabase = mockSupa;

    renderHook(() => useAuth(), { wrapper });
    await waitFor(() => {
      expect(mockSupa.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// onAuthStateChange — live session updates
// ═══════════════════════════════════════════════════════════════════════════
describe('onAuthStateChange — live updates', () => {
  test('updates session when auth state changes', async () => {
    supabaseModule.supabase = makeSupabaseMock(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();

    await act(async () => {
      authStateCallback?.('SIGNED_IN', mockSession);
    });

    expect(result.current.session).toBe(mockSession);
    expect(result.current.user?.id).toBe('user-123');
  });

  test('clears session on sign out event', async () => {
    supabaseModule.supabase = makeSupabaseMock(mockSession);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBe(mockSession);

    await act(async () => {
      authStateCallback?.('SIGNED_OUT', null);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// signIn
// ═══════════════════════════════════════════════════════════════════════════
describe('signIn', () => {
  test('calls signInWithPassword with correct credentials', async () => {
    const mockSupa = makeSupabaseMock(null);
    supabaseModule.supabase = mockSupa;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn('taylor@golf.com', 'password123');
    });

    expect(mockSupa.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'taylor@golf.com',
      password: 'password123',
    });
  });

  test('returns { error: null } on success', async () => {
    supabaseModule.supabase = makeSupabaseMock(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await act(async () =>
      result.current.signIn('user@email.com', 'pass')
    );

    expect(response.error).toBeNull();
  });

  test('returns { error: message } on auth failure', async () => {
    const mockSupa = makeSupabaseMock(null);
    mockSupa.auth.signInWithPassword = jest.fn().mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    supabaseModule.supabase = mockSupa;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await act(async () =>
      result.current.signIn('user@email.com', 'wrongpass')
    );

    expect(response.error).toBe('Invalid login credentials');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// signUp
// ═══════════════════════════════════════════════════════════════════════════
describe('signUp', () => {
  test('calls supabase.auth.signUp with email and password', async () => {
    const mockSupa = makeSupabaseMock(null);
    supabaseModule.supabase = mockSupa;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signUp('new@user.com', 'password123');
    });

    expect(mockSupa.auth.signUp).toHaveBeenCalledWith({
      email: 'new@user.com',
      password: 'password123',
    });
  });

  test('returns { error: null } on success', async () => {
    supabaseModule.supabase = makeSupabaseMock(null);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await act(async () =>
      result.current.signUp('new@user.com', 'pass')
    );

    expect(response.error).toBeNull();
  });

  test('returns { error: message } when signup fails', async () => {
    const mockSupa = makeSupabaseMock(null);
    mockSupa.auth.signUp = jest.fn().mockResolvedValue({
      error: { message: 'Email already registered' },
    });
    supabaseModule.supabase = mockSupa;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const response = await act(async () =>
      result.current.signUp('dupe@user.com', 'pass')
    );

    expect(response.error).toBe('Email already registered');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// signOut
// ═══════════════════════════════════════════════════════════════════════════
describe('signOut', () => {
  test('calls supabase.auth.signOut', async () => {
    const mockSupa = makeSupabaseMock(mockSession);
    supabaseModule.supabase = mockSupa;

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockSupa.auth.signOut).toHaveBeenCalledTimes(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════════════════
describe('cleanup on unmount', () => {
  test('calls subscription.unsubscribe when component unmounts', async () => {
    supabaseModule.supabase = makeSupabaseMock(null);

    const { result, unmount } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
