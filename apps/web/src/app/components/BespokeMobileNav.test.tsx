import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import React from "react";
import {
  MobileMenuButton,
  BespokeMobileNavDrawer,
  BespokeMobileBottomDock,
  MAIN_PAGES,
} from "./BespokeMobileNav";
import { ThemeContext } from "../Root";

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockThemeContext = {
  isDark: false,
  toggle: vi.fn(),
};

const LOGGED_IN_TALENT = {
  id: "usr-talent-1",
  email: "emeka@monologg.co",
  name: "Emeka Johnson",
  userType: "TALENT" as const,
  authProvider: "EMAIL",
  isNewUser: false,
};

const LOGGED_IN_CLIENT = {
  id: "usr-client-1",
  email: "sarah@filmcraft.com",
  name: "Sarah Jenkins",
  userType: "CLIENT" as const,
  authProvider: "GOOGLE",
  isNewUser: false,
};

function renderWithProviders(ui: React.ReactElement, initialPath = "/") {
  return render(
    <ThemeContext.Provider value={mockThemeContext}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </ThemeContext.Provider>,
  );
}

describe("BespokeMobileNav Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MobileMenuButton", () => {
    it("renders with closed state accessibility attributes", () => {
      renderWithProviders(<MobileMenuButton isOpen={false} onClick={vi.fn()} />);
      const btn = screen.getByRole("button", { name: "Open navigation menu" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("aria-expanded", "false");
    });

    it("renders with open state accessibility attributes and calls onClick", () => {
      const onClick = vi.fn();
      renderWithProviders(<MobileMenuButton isOpen={true} onClick={onClick} />);
      const btn = screen.getByRole("button", { name: "Close navigation menu" });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("BespokeMobileNavDrawer (Rise-style minimal navigation)", () => {
    it("renders all 4 main pages when open with clean vertical layout", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <BespokeMobileNavDrawer
          activePage="product"
          isOpen={true}
          onClose={onClose}
          loggedInUser={null}
        />,
        "/product",
      );

      // Verify all 4 main pages are rendered
      MAIN_PAGES.forEach((page) => {
        expect(screen.getByText(page.label)).toBeInTheDocument();
      });

      // Click on Pricing
      fireEvent.click(screen.getByText("Pricing"));
      expect(onClose).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith("/pricing");
    });

    it("renders logged-out auth pill CTAs: Sign in and Get started", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <BespokeMobileNavDrawer
          activePage="home"
          isOpen={true}
          onClose={onClose}
          loggedInUser={null}
        />,
      );

      const signInBtn = screen.getByRole("button", { name: "Sign in" });
      const getStartedBtn = screen.getByRole("button", { name: "Get started" });
      expect(signInBtn).toBeInTheDocument();
      expect(getStartedBtn).toBeInTheDocument();

      fireEvent.click(signInBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signin");

      fireEvent.click(getStartedBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/auth?mode=signup");
    });

    it("renders logged-in auth pills: Dashboard and Sign out for Performer", () => {
      const onClose = vi.fn();
      const onSignOut = vi.fn();
      renderWithProviders(
        <BespokeMobileNavDrawer
          activePage="home"
          isOpen={true}
          onClose={onClose}
          loggedInUser={LOGGED_IN_TALENT}
          displayName="Emeka Johnson"
          isClientSession={false}
          onSignOut={onSignOut}
        />,
      );

      const dashboardBtn = screen.getByRole("button", { name: "Dashboard" });
      const signOutBtn = screen.getByRole("button", { name: "Sign out" });
      expect(dashboardBtn).toBeInTheDocument();
      expect(signOutBtn).toBeInTheDocument();

      fireEvent.click(dashboardBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");

      fireEvent.click(signOutBtn);
      expect(onSignOut).toHaveBeenCalledTimes(1);
    });

    it("renders logged-in auth pills: Dashboard routes to /client for Client workspace", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <BespokeMobileNavDrawer
          activePage="home"
          isOpen={true}
          onClose={onClose}
          loggedInUser={LOGGED_IN_CLIENT}
          displayName="Sarah Jenkins"
          isClientSession={true}
        />,
      );

      const dashboardBtn = screen.getByRole("button", { name: "Dashboard" });
      fireEvent.click(dashboardBtn);
      expect(mockNavigate).toHaveBeenCalledWith("/client");
    });

    it("triggers theme toggle button in header", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <BespokeMobileNavDrawer
          activePage="home"
          isOpen={true}
          onClose={onClose}
          loggedInUser={null}
        />,
      );

      const themeBtn = screen.getByRole("button", { name: "Toggle theme" });
      fireEvent.click(themeBtn);
      expect(mockThemeContext.toggle).toHaveBeenCalledTimes(1);
    });

    it("triggers close button when X is clicked", () => {
      const onClose = vi.fn();
      renderWithProviders(
        <BespokeMobileNavDrawer
          activePage="home"
          isOpen={true}
          onClose={onClose}
          loggedInUser={null}
        />,
      );

      const closeBtn = screen.getByRole("button", { name: "Close navigation menu" });
      fireEvent.click(closeBtn);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("BespokeMobileBottomDock", () => {
    it("renders thumb-friendly dock with 4 main pages and menu toggle", () => {
      const onToggle = vi.fn();
      renderWithProviders(
        <BespokeMobileBottomDock
          activePage="pricing"
          isMenuOpen={false}
          onToggleMenu={onToggle}
          loggedInUser={null}
        />,
        "/pricing",
      );

      expect(screen.getByLabelText("Home")).toBeInTheDocument();
      expect(screen.getByLabelText("Product")).toBeInTheDocument();
      expect(screen.getByLabelText("Pricing")).toBeInTheDocument();
      expect(screen.getByLabelText("Resources")).toBeInTheDocument();
      expect(screen.getByLabelText("Open menu")).toBeInTheDocument();

      // Navigate to Home
      fireEvent.click(screen.getByLabelText("Home"));
      expect(mockNavigate).toHaveBeenCalledWith("/");

      // Toggle menu
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it("shows Close state when menu is open in bottom dock", () => {
      const onToggle = vi.fn();
      renderWithProviders(
        <BespokeMobileBottomDock
          activePage="home"
          isMenuOpen={true}
          onToggleMenu={onToggle}
          loggedInUser={null}
        />,
      );

      expect(screen.getByLabelText("Close menu")).toBeInTheDocument();
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
  });
});
