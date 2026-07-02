import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginScreen } from "@/login-core/src/login-screen";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => unknown;
  }) => select({ location: { pathname: "/login" } }),
}));

vi.mock("@/lib/api/wgw/http", () => ({
  wgwLoginWithCredentials: vi.fn().mockResolvedValue(undefined),
}));

describe("LoginScreen return path", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    window.history.replaceState({}, "", "/login");
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects to ?return destination after successful sign-in", async () => {
    window.history.replaceState({}, "", "/login?return=%2Fdocs");

    render(<LoginScreen />);

    fireEvent.change(screen.getByPlaceholderText("yourname"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/docs" });
    });
  });

  it("prefers explicit returnPath prop over query string", async () => {
    window.history.replaceState({}, "", "/login?return=%2Fmail");

    render(<LoginScreen returnPath="/notes" />);

    fireEvent.change(screen.getByPlaceholderText("yourname"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/notes" });
    });
  });

  it("falls back to home when no return is provided", async () => {
    render(<LoginScreen />);

    fireEvent.change(screen.getByPlaceholderText("yourname"), { target: { value: "demo" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });
});
