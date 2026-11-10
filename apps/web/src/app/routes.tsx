import { createBrowserRouter, Navigate } from "react-router";
import { Root } from "./Root";
import { RequireAuth } from "./RequireAuth";
import { LandingPage } from "./pages/LandingPage";
import { AuthFlow } from "./pages/AuthFlow";
import { CreatorOnboarding } from "./pages/CreatorOnboarding";
import { ClientOnboarding } from "./pages/ClientOnboarding";
import { TalentDashboard } from "./pages/TalentDashboard";
import { ClientDashboard } from "./pages/ClientDashboard";
import { OrderRoom } from "./pages/OrderRoom";
import { ProjectBrief } from "./pages/ProjectBrief";
import { Checkout } from "./pages/Checkout";
import { Settings } from "./pages/Settings";
import { TransactionHistory } from "./pages/TransactionHistory";
import { HelpSupport } from "./pages/HelpSupport";
import { LegalPage } from "./pages/LegalPage";
import { DesignSystem } from "./pages/DesignSystem";
import { MediaKitManagement } from "./pages/MediaKitManagement";
import { VerificationVideo } from "./pages/VerificationVideo";
import { PublicStorefront } from "./pages/PublicStorefront";
import { ProductPage } from "./pages/ProductPage";
import { PricingPage } from "./pages/PricingPage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { ExternalBookingEntry } from "./pages/ExternalBookingEntry";
import { SetPassword } from "./pages/SetPassword";
import { AuthCallback } from "./pages/AuthCallback";

// Wraps a page component with the auth guard (features.md Phase 4) — a no-op in the
// default `mock` API mode, real gating once `live` mode + Phase 5 endpoints land.
function protect(Component: React.ComponentType) {
  return function Protected() {
    return (
      <RequireAuth>
        <Component />
      </RequireAuth>
    );
  };
}

// Shared route tree — reused by both the browser-history router (dev server /
// real hosting, see below) and the hash router used for the standalone,
// double-clickable HTML build (see AppStandalone.tsx), since file:// pages
// can't use pushState-based navigation.
export const routeTree = [
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: LandingPage },
      { path: "auth", Component: AuthFlow },
      { path: "onboarding", Component: CreatorOnboarding },
      { path: "onboarding/client", Component: ClientOnboarding },
      { path: "dashboard", Component: protect(TalentDashboard) },
      { path: "client", Component: protect(ClientDashboard) },
      { path: "order/:id", Component: protect(OrderRoom) },
      { path: "brief", Component: protect(ProjectBrief) },
      { path: "brief/:id", Component: protect(ProjectBrief) },
      { path: "checkout", Component: protect(Checkout) },
      { path: "settings", Component: protect(Settings) },
      { path: "transactions", Component: protect(TransactionHistory) },
      { path: "support", Component: protect(HelpSupport) },
      { path: "media-kit", Component: protect(MediaKitManagement) },
      { path: "verification", Component: protect(VerificationVideo) },
      { path: "legal/terms", Component: () => <LegalPage type="terms" /> },
      { path: "legal/cookies", Component: () => <LegalPage type="cookies" /> },
      { path: "legal/privacy", Component: () => <LegalPage type="privacy" /> },
      { path: "terms", Component: () => <LegalPage type="terms" /> },
      { path: "cookies", Component: () => <LegalPage type="cookies" /> },
      { path: "privacy", Component: () => <LegalPage type="privacy" /> },
      { path: "design-system", Component: DesignSystem },
      { path: "product", Component: ProductPage },
      { path: "pricing", Component: PricingPage },
      { path: "resources", Component: ResourcesPage },
      { path: "newsletter", Component: () => <Navigate to="/#newsletter" replace /> },
      { path: "subscribe", Component: () => <Navigate to="/#newsletter" replace /> },
      { path: "waitlist", Component: () => <Navigate to="/#newsletter" replace /> },
      { path: "investor", Component: () => <Navigate to="/resources#investor" replace /> },
      { path: "investors", Component: () => <Navigate to="/resources#investor" replace /> },
      { path: "search", Component: () => <Navigate to="/client" replace /> },
      { path: "gigs", Component: () => <Navigate to="/dashboard" replace /> },
      { path: "post-gig", Component: () => <Navigate to="/brief" replace /> },
      { path: "login", Component: () => <Navigate to="/auth?mode=signin" replace /> },
      { path: "signin", Component: () => <Navigate to="/auth?mode=signin" replace /> },
      { path: "signup", Component: () => <Navigate to="/auth?mode=signup" replace /> },
      { path: "register", Component: () => <Navigate to="/auth?mode=signup" replace /> },
      // features.md Phase 16 (FA-5) stub entry point — public, no auth; see
      // ExternalBookingEntry.tsx's own doc comment. Declared before ":handle"
      // so "book" is never swallowed as someone's handle (React Router ranks
      // static segments over dynamic ones regardless of order, but the
      // explicit ordering here documents the intent either way).
      { path: "book/:creatorId", Component: ExternalBookingEntry },
      // features.md Phase 16 (FA-5), PWA-19: the emailed set-password/magic-link
      // destination for a guest-checkout buyer's auto-created account. Public, no
      // auth — this route IS how they get a session.
      { path: "set-password", Component: SetPassword },
      // Phase 12B: OAuth / magic-link / OTP callback from Supabase Auth.
      // Public, no auth guard — this IS how a Supabase user gets their session.
      // Placed before ":handle" so the static segment is matched first.
      { path: "auth/callback", Component: AuthCallback },
      // features.md Phase 15 (FA-3) — the public marketplace profile. Public,
      // no auth, deliberately LAST: a single dynamic segment at the root
      // level, so every more-specific route above must be tried first.
      { path: ":handle", Component: PublicStorefront },
    ],
  },
];

export const router = createBrowserRouter(routeTree);
