import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "../components/ui/Avatar";
import { WebsiteFooter } from "../components/ui/WebsiteFooter";
import { TopAnnouncementBar } from "../components/TopAnnouncementBar";
import { useTheme } from "../Root";
import { appStateSync } from "../../lib/state-sync";
import { apiClient } from "../../lib/api-client";
import { supabase } from "../../lib/supabase";
import { trackEvent } from "../../lib/analytics";
import {
  BespokeMobileNavDrawer,
  MobileMenuButton,
} from "../components/BespokeMobileNav";
import {
  ChevronDown,
  Check,
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
  Loader2,
} from "lucide-react";

const ASSETS = {
  logoMask: "/assets/resources/logo-mask.svg",
  logoIcon: "/assets/resources/logo-icon.svg",
  logoWordmark: "/assets/resources/logo-wordmark.svg",
  themeToggle: "/assets/resources/theme-toggle.svg",
  gavel: "/assets/resources/gavel.svg",
  vector2553: "/assets/resources/vector-2553.svg",
  vector2555: "/assets/resources/vector-2555.svg",
  question: "/assets/resources/question.svg",
  gmail: "/assets/resources/gmail.svg",
  linkedin: "/assets/resources/linkedin.svg",
  producthunt: "/assets/resources/producthunt.svg",
  twitterX: "/assets/resources/twitter-x.svg",
  twitch: "/assets/resources/twitch.svg",
  telegram: "/assets/resources/telegram.svg",
  tiktok: "/assets/resources/tiktok.svg",
  instagram: "/assets/resources/instagram.svg",
  caretDown: "/assets/resources/caret-down.svg",
  arrowRight: "/assets/resources/arrow-right.svg",
};

export function ResourcesPage() {
  const navigate = useNavigate();
  const { toggle } = useTheme();

  const [loggedInUser, setLoggedInUser] = useState(appStateSync.getLoggedInUser());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Investor form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [investorRole, setInvestorRole] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.location.hash === "#investor") {
        const timer = setTimeout(() => {
          const el = document.getElementById("investor");
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 100);
        return () => clearTimeout(timer);
      } else {
        window.scrollTo?.(0, 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === "#investor") {
        const el = document.getElementById("investor");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => {
    return appStateSync.subscribe(() => {
      setLoggedInUser(appStateSync.getLoggedInUser());
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await apiClient.logout();
    } catch {}
    appStateSync.setLoggedInUser(null);
    setShowUserMenu(false);
    navigate("/");
  };

  const handleInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    const applicationId = "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const payload = {
      id: applicationId,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      investorRole: investorRole || "Other",
      message: message.trim() || null,
      status: "PENDING",
    };

    try {
      // 1. Direct Supabase Storage into public."InvestorApplication"
      if (supabase) {
        const { error } = await supabase.from("InvestorApplication").insert(payload);
        if (error) {
          console.warn("Supabase InvestorApplication insert warning:", error.message);
        }
      }

      // 2. Track event in Supabase AnalyticsEvent + local telemetry buffer
      trackEvent("waitlist_submitted", {
        type: "investor_application",
        applicationId,
        investorRole: payload.investorRole,
        email: payload.email,
        name: `${payload.firstName} ${payload.lastName}`,
      });

      setSubmitted(true);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPhone("");
      setInvestorRole("");
      setMessage("");

      setTimeout(() => {
        setSubmitted(false);
      }, 6000);
    } catch (err: unknown) {
      console.error("Failed to submit investor application:", err);
      setSubmitError("Failed to submit application. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitials = loggedInUser?.name
    ? loggedInUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const talentProfile = loggedInUser ? appStateSync.getTalentProfile() : null;
  const userAvatarUrl = talentProfile?.avatarUrl;

  const userMenuItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: loggedInUser?.userType === "TALENT" ? "/dashboard" : "/client",
    },
    { label: "Settings", icon: SettingsIcon, path: "/settings" },
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-white dark:bg-[#000000] text-[#1a1a1a] dark:text-[#f9f9f9] font-sans antialiased overflow-x-clip relative isolate"
      data-node-id="178359:18325"
    >
      {/* ── 1. Top Announcement Bar (178359:18326) ── */}
      <TopAnnouncementBar nodeId="178359:18326" />

      {/* ── 2. Sticky Header (178359:18338) ── */}
      <header
        className="backdrop-blur-[12px] bg-white/95 dark:bg-[#000000]/95 border-[#e8e8e8] dark:border-[#1a1a1a] border-b border-solid flex h-[68px] items-center justify-between px-4 sm:px-8 lg:px-[64px] shrink-0 sticky top-0 w-full z-50 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)]"
        data-node-id="178359:18338"
      >
        <div
          className="flex gap-[12px] items-center relative shrink-0"
          data-node-id="178359:18340"
        >
          {/* Figma Masked Monologg Logo (178359:18341) */}
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Monologg Home"
            className="h-[24px] overflow-clip relative shrink-0 w-[105.109px] cursor-pointer"
            data-node-id="178359:18341"
          >
            <div className="absolute contents inset-[14.02%_80.78%_14.25%_3.55%]">
              <div
                className="absolute inset-[14.93%_81%_15.21%_3.77%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.226px_-0.219px] mask-size-[16.466px_17.215px]"
                style={{
                  maskImage: `url("${ASSETS.logoMask}")`,
                  WebkitMaskImage: `url("${ASSETS.logoMask}")`,
                }}
              >
                <div className="absolute inset-[-1.33%_-1.39%_-1.65%_-1.39%]">
                  <img
                    alt="Monologg"
                    className="block max-w-none size-full dark:invert"
                    src={ASSETS.logoIcon}
                  />
                </div>
              </div>
            </div>
            <div className="absolute inset-[22.1%_1.22%_6.52%_24.14%]">
              <img
                alt="Monologg"
                className="absolute block inset-0 max-w-none size-full dark:invert"
                src={ASSETS.logoWordmark}
              />
            </div>
          </button>

          <nav
            className="hidden md:flex gap-[4px] items-center relative shrink-0"
            data-node-id="178359:18353"
          >
            <button
              onClick={() => navigate("/product")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
              data-node-id="178359:18354"
            >
              Product
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
              data-node-id="178359:18356"
            >
              Pricing
            </button>
            <div
              className="px-[16px] py-[6px] rounded-full flex items-center gap-[10px] whitespace-nowrap cursor-default"
              data-node-id="178359:18358"
            >
              <div
                className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] size-[8px] rounded-full shrink-0"
                data-node-id="178359:18360"
              />
              <span
                className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#f25757] text-[12px] leading-[16px]"
                data-node-id="178359:18361"
              >
                Resources
              </span>
            </div>
          </nav>
        </div>

        <div
          className="flex gap-[12px] items-center relative shrink-0"
          data-node-id="178359:18364"
        >
          {/* Theme Toggle Button (178359:18365) */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex items-center justify-center relative rounded-full shrink-0 size-[36px] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            data-node-id="178359:18365"
          >
            <img
              alt="Toggle theme"
              className="size-[16px]"
              src={ASSETS.themeToggle}
            />
          </button>

          {loggedInUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-full p-1 pr-2 border border-[#e8e8e8] dark:border-[#1a1a1a] bg-white dark:bg-[#000000] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-all active:scale-95 shadow-sm cursor-pointer"
                aria-label="Account menu"
              >
                <Avatar
                  size="sm"
                  src={userAvatarUrl ?? undefined}
                  background="#f13030"
                  color="#ffffff"
                >
                  {userInitials}
                </Avatar>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#767676] dark:text-[#a3a3a3] transition-transform ${
                    showUserMenu ? "rotate-180" : ""
                  }`}
                />
              </button>

              <AnimatePresence>
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl shadow-xl overflow-hidden z-50 bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a]"
                  >
                    <div className="flex items-center gap-3 p-4 border-b border-[#e8e8e8] dark:border-[#1a1a1a]">
                      <Avatar
                        size="md"
                        src={userAvatarUrl ?? undefined}
                        background="#f13030"
                        color="#ffffff"
                      >
                        {userInitials}
                      </Avatar>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate text-[#1a1a1a] dark:text-[#f9f9f9]">
                          {loggedInUser.name}
                        </div>
                        <div className="text-xs truncate text-[#767676] dark:text-[#a3a3a3]">
                          {loggedInUser.email}
                        </div>
                      </div>
                    </div>
                    <div className="py-1.5">
                      {userMenuItems.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate(item.path);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                        >
                          <item.icon className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="py-1.5 border-t border-[#e8e8e8] dark:border-[#1a1a1a]">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[#f13030] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors font-medium cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              {/* Sign In Button (178359:18368) */}
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signin")}
                className="border border-[#d1d1d1] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center justify-center pb-[11.5px] pt-[10.5px] px-[20px] relative rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1a1a1a] dark:text-[#f9f9f9] text-[12px] text-center tracking-[-0.12px] whitespace-nowrap hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                data-node-id="178359:18368"
              >
                Sign In
              </button>

              {/* Sign up free Button (178359:18370) */}
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-[#f13030] hover:bg-[#d31f20] flex h-[40px] items-center justify-center pb-[12.5px] pt-[11.5px] px-[20px] relative rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] text-center text-white tracking-[-0.12px] whitespace-nowrap shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all active:scale-95 cursor-pointer"
                data-node-id="178359:18370"
              >
                Sign up free
              </button>
            </>
          )}

          {/* Bespoke Mobile Navigation Toggle */}
          <MobileMenuButton
            isOpen={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((v) => !v)}
          />
        </div>
      </header>

      {/* Bespoke Mobile Navigation Drawer */}
      <BespokeMobileNavDrawer
        activePage="resources"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        loggedInUser={loggedInUser}
        displayName={loggedInUser?.name}
        displayAvatar={userAvatarUrl ?? undefined}
        isClientSession={loggedInUser?.userType === "CLIENT"}
        onSignOut={handleSignOut}
      />


      <main className="flex-1 flex flex-col items-center w-full relative z-10">
        {/* ── 4. Resources Categories Master Card (Figma 178359:18384) ── */}
        <section
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-4 sm:px-8 xl:px-[200px] py-[80px] lg:py-[112px] relative w-full"
          data-node-id="178359:18384"
          data-name="testimonial"
        >
          <div
            className="flex flex-col items-center relative shrink-0 w-full max-w-[1000px]"
            data-node-id="178359:18409"
            data-name="Frame 2147228267"
          >
            {/* Top Box (Frame 427321871) */}
            <div
              className="bg-white dark:bg-[#000000] border-[#e8e8e8] dark:border-[#1a1a1a] border-l border-r border-t border-solid flex flex-col gap-[32px] items-center p-6 sm:p-[32px] relative rounded-tl-[20px] rounded-tr-[20px] shrink-0 w-full"
              data-node-id="178359:18410"
            >
              {/* Terms of Service Badge Pill (Frame 2147228278) */}
              <button
                type="button"
                onClick={() => navigate("/legal/terms")}
                className="bg-[#f7f7f7] dark:bg-[#1a1a1a] hover:bg-[#ececec] dark:hover:bg-[#333333] border border-transparent dark:border-[#1a1a1a] flex gap-[10px] items-center px-[12px] py-[6px] relative rounded-[20px] shrink-0 transition-colors cursor-pointer group"
                data-node-id="178359:18411"
              >
                <div
                  className="relative shrink-0 size-[14px]"
                  data-node-id="178359:18412"
                  data-name="Gavel"
                >
                  <img
                    alt="Terms of Service"
                    className="absolute block inset-0 max-w-none size-full dark:invert"
                    src={ASSETS.gavel}
                  />
                </div>
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center leading-normal text-[#1a1a1a] dark:text-[#f9f9f9] group-hover:text-[#f13030] dark:group-hover:text-[#f13030] text-[14px] tracking-[-0.42px] whitespace-nowrap transition-colors"
                  data-node-id="178359:18413"
                >
                  <p>Terms of Service</p>
                </div>
              </button>

              {/* Row 1: Escrow Guarantee Policy | Fair Trade Contracts (Frame 2147228208) */}
              <div
                className="bg-white dark:bg-[#000000] flex flex-col md:flex-row gap-[24px] items-center relative shrink-0 w-full"
                data-node-id="178359:18414"
              >
                {/* Col 1 */}
                <div
                  className="flex flex-1 flex-col md:h-[148px] items-center justify-start min-w-px relative w-full"
                  data-node-id="178359:18415"
                >
                  <div
                    className="flex flex-col gap-[20px] items-center text-center w-full"
                    data-node-id="178359:18418"
                  >
                    <h3
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]"
                      data-node-id="178359:18420"
                    >
                      Escrow Guarantee Policy
                    </h3>
                    <p
                      className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] text-center max-w-[444px]"
                      data-node-id="178359:18421"
                    >
                      All client and fan booking funds are locked securely in escrow before performance or recording begins and released upon project completion: guaranteed by Paystack.
                    </p>
                  </div>
                </div>

                {/* Vertical Divider (Vector 2553) */}
                <div
                  className="hidden md:block h-[148px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:18422"
                  data-name="Vector 2553"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={ASSETS.vector2553}
                    />
                  </div>
                </div>

                {/* Col 2 */}
                <div
                  className="flex flex-1 flex-col md:h-[148px] items-center justify-start min-w-px relative w-full"
                  data-node-id="178359:18423"
                >
                  <div
                    className="flex flex-col gap-[20px] items-center text-center w-full"
                    data-node-id="178359:18426"
                  >
                    <h3
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]"
                      data-node-id="178359:18427"
                    >
                      Fair Trade Contracts
                    </h3>
                    <p
                      className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] text-center max-w-[444px]"
                      data-node-id="178359:18428"
                    >
                      Automated NDAs, usage rights, and performance contracts protect creator IP and guarantee performer payment terms.
                    </p>
                  </div>
                </div>
              </div>

              {/* Horizontal Divider (Vector 2555) */}
              <div
                className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert"
                data-node-id="178359:18430"
                data-name="Vector 2555"
              >
                <div className="absolute inset-[-0.5px_0]">
                  <img
                    alt=""
                    className="block max-w-none size-full"
                    src={ASSETS.vector2555}
                  />
                </div>
              </div>

              {/* Support & Community Badge Pill (Frame 2147228277) */}
              <button
                type="button"
                onClick={() => navigate("/support")}
                className="bg-[#f7f7f7] dark:bg-[#1a1a1a] hover:bg-[#ececec] dark:hover:bg-[#333333] border border-transparent dark:border-[#1a1a1a] flex gap-[10px] items-center px-[12px] py-[6px] relative rounded-[20px] shrink-0 transition-colors cursor-pointer group"
                data-node-id="178359:18431"
              >
                <div
                  className="relative shrink-0 size-[14px]"
                  data-node-id="178359:18432"
                  data-name="Question"
                >
                  <img
                    alt="Support & Community"
                    className="absolute block inset-0 max-w-none size-full dark:invert"
                    src={ASSETS.question}
                  />
                </div>
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center leading-normal text-[#1a1a1a] dark:text-[#f9f9f9] group-hover:text-[#f13030] dark:group-hover:text-[#f13030] text-[14px] tracking-[-0.42px] whitespace-nowrap transition-colors"
                  data-node-id="178359:18433"
                >
                  <p>Support &amp; Community</p>
                </div>
              </button>

              {/* Row 2: 24/7 Creator Helpdesk | Onboarding & EPK Guides (Frame 2147228209) */}
              <div
                className="flex flex-col md:flex-row gap-[24px] items-center relative shrink-0 w-full"
                data-node-id="178359:18434"
              >
                {/* Col 1 */}
                <div
                  className="flex flex-1 flex-col md:h-[148px] items-center justify-start min-w-px relative w-full"
                  data-node-id="178359:18435"
                >
                  <div
                    className="flex flex-col gap-[20px] items-center text-center w-full"
                    data-node-id="178359:18438"
                  >
                    <h3
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]"
                      data-node-id="178359:18439"
                    >
                      24/7 Creator Helpdesk
                    </h3>
                    <p
                      className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] text-center max-w-[444px]"
                      data-node-id="178359:18440"
                    >
                      Live assistance for booking disputes, account setup, and fast settlement inquiries.
                    </p>
                  </div>
                </div>

                {/* Vertical Divider (Vector 2553) */}
                <div
                  className="hidden md:block h-[148px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:18441"
                  data-name="Vector 2553"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={ASSETS.vector2553}
                    />
                  </div>
                </div>

                {/* Col 2 */}
                <div
                  className="flex flex-1 flex-col md:h-[148px] items-center justify-start min-w-px relative w-full"
                  data-node-id="178359:18442"
                >
                  <div
                    className="flex flex-col gap-[20px] items-center text-center w-full"
                    data-node-id="178359:18445"
                  >
                    <h3
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]"
                      data-node-id="178359:18446"
                    >
                      Onboarding &amp; EPK Guides
                    </h3>
                    <p
                      className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] text-center max-w-[444px]"
                      data-node-id="178359:18447"
                    >
                      Tutorials helping performers optimize showreels, rate cards, and bio storefronts for maximum booking conversions.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: hello@monologg.co + 6 Social Badges (Frame 2147227600) */}
            <div
              className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex flex-col sm:flex-row gap-[16px] sm:gap-[12px] items-center justify-center px-[32px] py-[16px] relative rounded-bl-[20px] rounded-br-[20px] shrink-0 w-full"
              data-node-id="178359:18448"
            >
              <div
                className="flex gap-[4px] items-center justify-center relative shrink-0"
                data-node-id="178359:18449"
              >
                <div
                  className="relative shrink-0 size-[18px]"
                  data-node-id="178359:18450"
                  data-name="Gmail"
                >
                  <img
                    alt="Gmail"
                    className="absolute block inset-0 max-w-none size-full"
                    src={ASSETS.gmail}
                  />
                </div>
                <a
                  href="mailto:hello@monologg.co"
                  className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[15px] leading-[20px] underline tracking-[0.45px] transition-colors whitespace-nowrap"
                  data-node-id="178359:18451"
                >
                  hello@monologg.co
                </a>
              </div>

              {/* Social Avatars Group (Avatar group - 178359:18452) */}
              <div
                className="flex gap-[3px] items-center relative shrink-0"
                data-node-id="178359:18452"
                data-name="Avatar group"
              >
                <a
                  href="https://linkedin.com/company/monologg"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="bg-white dark:bg-[#000000] border-[#e8e8e8] dark:border-[#1a1a1a] border-[0.277px] border-solid flex items-center justify-center overflow-clip p-[9.139px] relative rounded-[553.846px] shrink-0 size-[36.28px] hover:scale-105 transition-transform"
                  data-node-id="178359:18455"
                >
                  <img alt="LinkedIn" className="size-[18px]" src={ASSETS.linkedin} />
                </a>
                <a
                  href="https://www.producthunt.com/products/monologg"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Product Hunt"
                  className="bg-white dark:bg-[#000000] border-[#e8e8e8] dark:border-[#1a1a1a] border-[0.277px] border-solid flex items-center justify-center overflow-clip p-[9.139px] relative rounded-[553.846px] shrink-0 size-[36.28px] hover:scale-105 transition-transform"
                  data-node-id="178359:18457"
                >
                  <img alt="Product Hunt" className="size-[18px]" src={ASSETS.producthunt} />
                </a>
                <a
                  href="https://x.com/getmonologg"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter-X"
                  className="bg-white dark:bg-[#000000] border-[#e8e8e8] dark:border-[#1a1a1a] border-[0.277px] border-solid flex items-center justify-center overflow-clip p-[9.139px] relative rounded-[553.846px] shrink-0 size-[36.28px] hover:scale-105 transition-transform"
                  data-node-id="178359:18459"
                >
                  <img alt="Twitter-X" className="size-[18px] dark:invert" src={ASSETS.twitterX} />
                </a>
                <a
                  href="https://www.instagram.com/getmonologg"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="bg-white dark:bg-[#000000] border-[#e8e8e8] dark:border-[#1a1a1a] border-[0.277px] border-solid flex items-center justify-center overflow-clip px-[9.75px] py-[9px] relative rounded-[200px] shrink-0 size-[36.28px] hover:scale-105 transition-transform"
                  data-node-id="178359:18467"
                >
                  <img alt="Instagram" className="size-[18px]" src={ASSETS.instagram} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. Become an Investor Section (Figma 178359:18473) ── */}
        <section
          id="investor"
          className="bg-white dark:bg-[#000000] flex items-start justify-center px-4 sm:px-8 xl:px-[200px] py-[80px] lg:py-[112px] relative w-full scroll-mt-24"
          data-node-id="178359:18473"
          data-name="testimonial"
        >
          <div
            className="flex flex-col lg:flex-row flex-1 items-start justify-between min-w-px relative w-full max-w-[1040px] gap-12 lg:gap-8"
            data-node-id="178359:18474"
            data-name="Frame 2147228275"
          >
            {/* Left Header Description (Frame 1216401504) */}
            <div
              className="flex flex-col gap-[32px] items-start justify-center relative shrink-0 max-w-[388px]"
              data-node-id="178359:18475"
            >
              <div
                className="flex flex-col gap-[16px] items-start relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9]"
                data-node-id="178359:18476"
              >
                <div
                  className="flex flex-col font-['Geist_Mono',monospace] font-normal justify-center relative shrink-0 text-[14px] tracking-[1.26px] uppercase whitespace-nowrap text-[#1a1a1a] dark:text-[#f9f9f9]"
                  data-node-id="178359:18477"
                >
                  <p className="leading-normal">RAISING SOON!</p>
                </div>
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[48px] tracking-[-1.44px] w-full"
                  data-node-id="178359:18478"
                >
                  <h2 className="leading-[48px] text-[#1a1a1a] dark:text-[#f9f9f9]">Become an Investor</h2>
                </div>
              </div>
              <div
                className="flex flex-col font-['Inter_Tight',sans-serif] font-normal justify-center relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[18px] tracking-[0.54px] w-full"
                data-node-id="178359:18479"
              >
                <p className="leading-[26px]">Follow our investor updates and be notified on our next round</p>
              </div>
            </div>

            {/* Right Application Form Card (Frame 2 - 178359:18480) */}
            <form
              onSubmit={handleInvestorSubmit}
              className="bg-white dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid shadow-[0px_1px_1px_rgba(0,0,0,0.1)] flex flex-col gap-[16px] items-start p-[25px] relative rounded-[18px] shrink-0 w-full lg:w-[530px]"
              data-node-id="178359:18480"
              data-name="Frame 2"
            >
              {submitted && (
                <div className="w-full p-4 rounded-xl bg-[#ecfdf5] dark:bg-[#064e3b]/30 border border-[#a7f3d0] dark:border-[#065f46] text-[#065f46] dark:text-[#a7f3d0] text-sm flex items-center gap-2">
                  <Check className="size-4 shrink-0 text-[#059669]" />
                  <span>Thank you for your interest! We will be in touch with investor deck updates.</span>
                </div>
              )}

              {/* Row 1: First Name & Last Name */}
              <div
                className="flex flex-col sm:flex-row gap-[10px] items-start relative w-full"
                data-node-id="178359:18481"
              >
                {/* First Name */}
                <div
                  className="flex flex-1 flex-col gap-[8px] items-start min-w-px relative w-full"
                  data-node-id="178359:18482"
                >
                  <label
                    htmlFor="first-name"
                    className="font-['Switzer',sans-serif] font-medium text-[#484848] dark:text-[#bababa] text-[14px] leading-[20px] tracking-[-0.2px] text-left w-full cursor-pointer"
                  >
                    First Name
                  </label>
                  <div className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center overflow-clip px-[13px] py-[9px] relative rounded-[12px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full focus-within:border-[#f13030] transition-colors">
                    <input
                      id="first-name"
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      className="flex-1 font-['Inter_Tight',sans-serif] font-normal leading-[1.5] min-w-px text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] text-left tracking-[0.42px] placeholder:text-[#767676] dark:placeholder:text-[#a3a3a3]/50 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Last Name */}
                <div
                  className="flex flex-1 flex-col gap-[8px] items-start min-w-px relative w-full"
                  data-node-id="178359:18483"
                >
                  <label
                    htmlFor="last-name"
                    className="font-['Switzer',sans-serif] font-medium text-[#484848] dark:text-[#bababa] text-[14px] leading-[20px] tracking-[-0.2px] text-left w-full cursor-pointer"
                  >
                    Last Name
                  </label>
                  <div className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center overflow-clip px-[13px] py-[9px] relative rounded-[12px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full focus-within:border-[#f13030] transition-colors">
                    <input
                      id="last-name"
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="flex-1 font-['Inter_Tight',sans-serif] font-normal leading-[1.5] min-w-px text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] text-left tracking-[0.42px] placeholder:text-[#767676] dark:placeholder:text-[#a3a3a3]/50 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Email & Phone No */}
              <div
                className="flex flex-col sm:flex-row gap-[12px] items-start relative w-full"
                data-node-id="178359:18484"
              >
                {/* Email */}
                <div
                  className="flex flex-1 flex-col gap-[8px] items-start min-w-px relative w-full"
                  data-node-id="178359:18485"
                >
                  <label
                    htmlFor="investor-email"
                    className="font-['Switzer',sans-serif] font-medium text-[#484848] dark:text-[#bababa] text-[14px] leading-[20px] tracking-[-0.2px] text-left w-full cursor-pointer"
                  >
                    Email
                  </label>
                  <div className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center overflow-clip px-[13px] py-[9px] relative rounded-[12px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full focus-within:border-[#f13030] transition-colors">
                    <input
                      id="investor-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@email.com"
                      className="flex-1 font-['Inter_Tight',sans-serif] font-normal leading-[1.5] min-w-px text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] text-left tracking-[0.42px] placeholder:text-[#767676] dark:placeholder:text-[#a3a3a3]/50 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Phone No */}
                <div
                  className="flex flex-1 flex-col gap-[8px] items-start min-w-px relative w-full"
                  data-node-id="178359:18486"
                >
                  <label
                    htmlFor="phone-no"
                    className="font-['Switzer',sans-serif] font-medium text-[#484848] dark:text-[#bababa] text-[14px] leading-[20px] tracking-[-0.2px] text-left w-full cursor-pointer"
                  >
                    phone no
                  </label>
                  <div className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center overflow-clip px-[13px] py-[9px] relative rounded-[12px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full focus-within:border-[#f13030] transition-colors">
                    <input
                      id="phone-no"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+234 567 2907 67"
                      className="flex-1 font-['Inter_Tight',sans-serif] font-normal leading-[1.5] min-w-px text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] text-left tracking-[0.42px] placeholder:text-[#767676] dark:placeholder:text-[#a3a3a3]/50 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Please tell us who you are */}
              <div
                className="flex flex-col gap-[8px] items-start relative w-full"
                data-node-id="178359:18487"
              >
                <label
                  htmlFor="who-you-are"
                  className="font-['Switzer',sans-serif] font-medium text-[#484848] dark:text-[#bababa] text-[14px] leading-[20px] tracking-[-0.2px] text-left w-full cursor-pointer"
                >
                  Please tell us who you are
                </label>
                <div className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid relative flex h-[40px] items-center rounded-[12px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-full focus-within:border-[#f13030] transition-colors">
                  <select
                    id="who-you-are"
                    required
                    value={investorRole}
                    onChange={(e) => setInvestorRole(e.target.value)}
                    className="w-full h-full bg-transparent font-['Inter_Tight',sans-serif] font-normal leading-[1.5] text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] text-left tracking-[0.42px] pl-[13px] pr-[36px] appearance-none focus:outline-none cursor-pointer"
                    style={{
                      WebkitAppearance: "none",
                      MozAppearance: "none",
                      appearance: "none",
                      backgroundImage: "none",
                    }}
                  >
                    <option value="" disabled className="text-gray-400 dark:bg-[#1a1a1a]">
                      Select an option...
                    </option>
                    <option value="Angel Investor" className="dark:bg-[#1a1a1a] dark:text-[#f9f9f9]">Angel Investor</option>
                    <option value="Venture Capital" className="dark:bg-[#1a1a1a] dark:text-[#f9f9f9]">Venture Capital</option>
                    <option value="Family Office" className="dark:bg-[#1a1a1a] dark:text-[#f9f9f9]">Family Office</option>
                    <option value="Creator / Talent" className="dark:bg-[#1a1a1a] dark:text-[#f9f9f9]">Creator / Talent</option>
                    <option value="Strategic Partner" className="dark:bg-[#1a1a1a] dark:text-[#f9f9f9]">Strategic Partner</option>
                    <option value="Other" className="dark:bg-[#1a1a1a] dark:text-[#f9f9f9]">Other</option>
                  </select>
                  <div
                    className="absolute right-[13px] top-1/2 -translate-y-1/2 pointer-events-none size-[16px] flex items-center justify-center dark:invert"
                    data-name="CaretDown"
                  >
                    <img
                      alt=""
                      className="block size-full"
                      src={ASSETS.caretDown}
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Message Textarea */}
              <div
                className="flex flex-col gap-[8px] items-start relative w-full"
                data-node-id="178359:18488"
              >
                <label
                  htmlFor="investor-message"
                  className="font-['Switzer',sans-serif] font-medium text-[#484848] dark:text-[#bababa] text-[14px] leading-[20px] tracking-[-0.2px] text-left w-full cursor-pointer"
                >
                  Message
                </label>
                <div className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex h-[160px] items-start overflow-clip p-[16px] relative rounded-[18px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] w-full focus-within:border-[#f13030] transition-colors">
                  <textarea
                    id="investor-message"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Leave us a message..."
                    className="flex-1 font-['Inter_Tight',sans-serif] font-normal leading-[1.5] min-w-px text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] text-left tracking-[0.42px] placeholder:text-[#767676] dark:placeholder:text-[#a3a3a3]/50 bg-transparent focus:outline-none resize-none size-full"
                  />
                </div>
              </div>

              {submitError && (
                <div className="w-full p-3 rounded-xl bg-[#fef2f2] dark:bg-[#7f1d1d]/30 border border-[#fecaca] dark:border-[#991b1b] text-[#b91c1c] dark:text-[#fca5a5] text-sm">
                  {submitError}
                </div>
              )}

              {/* Submit Application Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#f13030] hover:bg-[#d31f20] text-white disabled:opacity-60 h-[40px] relative rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 w-full cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-[8px] px-[24px] py-[8px]"
                data-node-id="178359:18489"
                data-name="Button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-[16px] text-white animate-spin" />
                    <span className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] text-center text-white tracking-[-0.12px] whitespace-nowrap leading-[16px]">
                      Submitting Application...
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] text-center text-white tracking-[-0.12px] whitespace-nowrap leading-[16px]"
                      data-node-id="178359:18491"
                    >
                      Submit Application
                    </span>
                    <div
                      className="relative shrink-0 size-[16px]"
                      data-node-id="178359:18492"
                      data-name="Icon / ArrowRight"
                    >
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full"
                        src={ASSETS.arrowRight}
                      />
                    </div>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* ── 6. Website Footer (Figma 178359:18494) ── */}
        <WebsiteFooter />
      </main>
    </div>
  );
}
