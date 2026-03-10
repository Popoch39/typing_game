import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockUseSession = vi.fn();
const mockSignInEmail = vi.fn();
const mockSignUpEmail = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: (...args: unknown[]) => mockUseSession(...args),
    signIn: {
      email: (...args: unknown[]) => mockSignInEmail(...args),
    },
    signUp: {
      email: (...args: unknown[]) => mockSignUpEmail(...args),
    },
    signOut: (...args: unknown[]) => mockSignOut(...args),
  },
}));

import { useSession, useLogin, useRegister, useSignOut } from "../use-auth";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSession", () => {
  it("should delegate to authClient.useSession", () => {
    mockUseSession.mockReturnValue({
      data: { user: { name: "Test" }, session: {} },
      isPending: false,
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: createWrapper(),
    });

    expect(mockUseSession).toHaveBeenCalled();
    expect(result.current.data?.user.name).toBe("Test");
  });
});

describe("useLogin", () => {
  it("should call signIn.email and redirect on success", async () => {
    mockSignInEmail.mockResolvedValue({
      data: { user: { id: "1" }, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ email: "test@example.com", password: "password123" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: "test@example.com",
      password: "password123",
    });
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should throw on error", async () => {
    mockSignInEmail.mockResolvedValue({
      data: null,
      error: { message: "Invalid credentials" },
    });

    const { result } = renderHook(() => useLogin(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ email: "test@example.com", password: "wrong" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Invalid credentials");
  });
});

describe("useRegister", () => {
  it("should call signUp.email and redirect on success", async () => {
    mockSignUpEmail.mockResolvedValue({
      data: { user: { id: "1" }, session: {} },
      error: null,
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      name: "Test User",
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSignUpEmail).toHaveBeenCalledWith({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
    });
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("should throw on error", async () => {
    mockSignUpEmail.mockResolvedValue({
      data: null,
      error: { message: "Email already exists" },
    });

    const { result } = renderHook(() => useRegister(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
      name: "Test",
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Email already exists");
  });
});

describe("useSignOut", () => {
  it("should call signOut and redirect to /login", async () => {
    mockSignOut.mockResolvedValue({});

    const { result } = renderHook(() => useSignOut(), {
      wrapper: createWrapper(),
    });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/login");
  });
});
