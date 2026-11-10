import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";
import { Avatar } from "../components/ui/Avatar";
import { WebsiteFooter } from "../components/ui/WebsiteFooter";
import { TopAnnouncementBar } from "../components/TopAnnouncementBar";
import { useTheme } from "../Root";
import { appStateSync } from "../../lib/state-sync";
import { apiClient } from "../../lib/api-client";
import {
  BespokeMobileNavDrawer,
  MobileMenuButton,
} from "../components/BespokeMobileNav";

export type LegalPageType = "terms" | "cookies" | "privacy";

const ASSETS = {
  logoMask: "/assets/terms/logo-mask.svg",
  logoIcon: "/assets/terms/logo-icon.svg",
  logoWordmark: "/assets/terms/logo-wordmark.svg",
  themeToggle: "/assets/terms/theme-toggle.svg",
  dashedDivider: "/assets/terms/dashed-divider.svg",
  arrowRight: "/assets/terms/arrow-right.svg",
  vector2553: "/assets/terms/vector-2553.svg",
};

const CARD_CLASSES =
  "border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid hover:border-transparent dark:hover:border-[#333333] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-all duration-200 flex flex-col gap-[20px] sm:gap-[24px] items-start p-5 sm:p-6 md:p-[24px] relative rounded-[16px] sm:rounded-[20px] shrink-0 w-full";

const COMPLIANCE_ROWS = [
  {
    area: "Lawful Basis for Processing",
    overview:
      "Personal data is processed under legitimate grounds: contract performance, statutory obligation, explicit consent, or legitimate interest.",
  },
  {
    area: "Data Subject Rights",
    overview:
      'Users retain the right to access, request corrections, request deletion ("right to be forgotten"), restrict processing, and port their personal data.',
  },
  {
    area: "International Data Transfers",
    overview:
      "Data transfers across international borders adhere to standard contractual clauses and regulations recognized by the NDPC and EU authorities.",
  },
  {
    area: "Data Retention",
    overview:
      "Information is retained only for as long as necessary to fulfill service objectives, meet legal requirements, and resolve disputes.",
  },
];

const COOKIE_SUMMARY_ROWS = [
  {
    id: "__session_id",
    category: "Strictly Necessary",
    purpose: "Maintains user authentication & active session state",
    duration: "Session",
    type: "First-Party",
  },
  {
    id: "_csrf_token",
    category: "Strictly Necessary",
    purpose: "Protects against cross-site request forgery attacks",
    duration: "Session",
    type: "First-Party",
  },
  {
    id: "pref_theme",
    category: "Functional",
    purpose: "Remembers interface dark/light display preferences",
    duration: "1 year",
    type: "First-Party",
  },
  {
    id: "_analytics_id",
    category: "Performance",
    purpose: "Measures aggregate page navigation & loading speeds",
    duration: "2 years",
    type: "Third- Party",
  },
  {
    id: "_mkt_trkr",
    category: "Targeting",
    purpose: "Tracks referral sources & campaign conversion rate",
    duration: "90 Days",
    type: "Third- Party",
  },
];

export function LegalPage({ type }: { type: LegalPageType }) {
  const navigate = useNavigate();
  const { toggle } = useTheme();

  const [loggedInUser, setLoggedInUser] = useState(appStateSync.getLoggedInUser());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.scrollTo?.(0, 0);
    } catch { }
  }, [type]);

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
    } catch { }
    appStateSync.setLoggedInUser(null);
    setShowUserMenu(false);
    navigate("/");
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

  const isTerms = type === "terms";

  return (
    <div
      className="bg-white dark:bg-[#000000] min-h-screen flex flex-col items-start relative w-full text-[#1a1a1a] dark:text-[#f9f9f9] font-['Plus_Jakarta_Sans',sans-serif] antialiased overflow-x-clip"
      data-node-id={isTerms ? "178382:17926" : "178383:18857"}
      data-name={isTerms ? "Terms of Service" : "Cookie Policy"}
    >
      {/* ── 1. Top Announcement Bar (178382:17927) ── */}
      <TopAnnouncementBar nodeId={isTerms ? "178382:17927" : "178383:18858"} />

      {/* ── 2. Sticky Header (178382:17939) ── */}
      <header
        className="backdrop-blur-[12px] bg-white/95 dark:bg-[#000000]/95 border-[#e8e8e8] dark:border-[#1a1a1a] border-b border-solid flex h-[68px] items-center justify-between px-4 sm:px-8 lg:px-[64px] shrink-0 sticky top-0 w-full z-50 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)]"
        data-node-id={isTerms ? "178382:17939" : "178387:19943"}
        data-name="Header"
      >
        <div className="flex gap-[12px] items-center shrink-0">
          {/* Masked Monologg Logo (178382:17942) */}
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Monologg Home"
            className="h-[24px] overflow-clip relative shrink-0 w-[105.109px] cursor-pointer"
            data-node-id={isTerms ? "178382:17942" : undefined}
            data-name="Img - Monologg"
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
                  <img alt="Monologg" className="block max-w-none size-full dark:invert" src={ASSETS.logoIcon} />
                </div>
              </div>
            </div>
            <div className="absolute inset-[22.1%_1.22%_6.52%_24.14%]">
              <img alt="Monologg" className="absolute block inset-0 max-w-none size-full dark:invert" src={ASSETS.logoWordmark} />
            </div>
          </button>

          {/* Navigation links (178382:17954) */}
          <nav className="hidden md:flex gap-[4px] items-center">
            <button
              type="button"
              onClick={() => navigate("/product")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate("/resources")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
            >
              Resources
            </button>
          </nav>
        </div>

        <div className="flex gap-[12px] items-center shrink-0">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex items-center justify-center rounded-full shrink-0 size-[36px] text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            data-node-id={isTerms ? "178382:17966" : undefined}
            data-name="Button - Toggle theme"
          >
            <div className="relative shrink-0 size-[16px]">
              <img alt="Toggle theme" className="block size-full" src={ASSETS.themeToggle} />
            </div>
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
                  className={`w-3.5 h-3.5 text-[#767676] dark:text-[#a3a3a3] transition-transform ${showUserMenu ? "rotate-180" : ""
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
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signin")}
                className="border border-[#d1d1d1] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center justify-center pb-[11.5px] pt-[10.5px] px-[20px] rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1a1a1a] dark:text-[#f9f9f9] text-[12px] text-center tracking-[-0.12px] whitespace-nowrap hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-[#f13030] hover:bg-[#d31f20] flex h-[40px] items-center justify-center pb-[12.5px] pt-[11.5px] px-[20px] rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] text-center text-white tracking-[-0.12px] whitespace-nowrap shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all active:scale-95 cursor-pointer"
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
        activePage="legal"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        loggedInUser={loggedInUser}
        displayName={loggedInUser?.name}
        displayAvatar={userAvatarUrl ?? undefined}
        isClientSession={loggedInUser?.userType === "CLIENT"}
        onSignOut={handleSignOut}
      />


      {/* ── 3. Main Legal Document Body ── */}
      {isTerms ? (
        <main
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-6 md:px-16 xl:px-[200px] py-[112px] relative shrink-0 w-full z-10"
          data-node-id="178382:17985"
          data-name="testimonial"
        >
          {/* Hero Header (178382:17999) */}
          <div
            className="flex flex-col items-center relative shrink-0 w-full max-w-[1040px]"
            data-node-id="178382:17999"
          >
            <div className="flex flex-col gap-[20px] items-center relative shrink-0 w-full">
              <div className="flex flex-col gap-[12px] items-center relative shrink-0">
                <div
                  className="flex gap-[10px] items-center justify-center relative shrink-0"
                  data-node-id="178382:18002"
                >
                  <div
                    className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid rounded-full shrink-0 size-[8px]"
                    data-node-id="178382:18003"
                  />
                  <p
                    className="font-['Geist_Mono',monospace] text-[#f13030] text-[14px] tracking-[1.26px] uppercase whitespace-nowrap leading-normal"
                    data-node-id="178382:18004"
                  >
                    Last Updated: 29 Oct 2026
                  </p>
                </div>
                <h1
                  className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-3xl sm:text-5xl md:text-[64px] text-center tracking-[-1.92px] leading-tight sm:leading-none"
                  data-node-id="178382:18005"
                >
                  Terms of Service
                </h1>
              </div>

              <div
                className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] text-center leading-[24px] tracking-[0.48px] max-w-[664px] w-full"
                data-node-id="178382:18006"
              >
                <p className="leading-[24px] mb-0">
                  Welcome to Monologg. Please review these Terms of Service (&quot;Terms&quot;) before using our website, platform, and digital services (collectively, the &quot;Services&quot;).
                </p>
                <p className="leading-[24px] mb-0" aria-hidden="true">
                  &nbsp;
                </p>
                <p className="leading-[24px] mb-0">
                  By accessing or using our Services, you agree to be legally bound by these Terms and our Privacy Policy. If you do not agree, please discontinue use of the Services immediately.
                </p>
              </div>
            </div>
          </div>

          {/* 12 Section Cards (178385:19525) */}
          <div
            className="flex flex-col gap-[40px] items-start relative shrink-0 w-full max-w-[911px]"
            data-node-id="178385:19525"
          >
            {/* Card 1 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19508"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                1. Eligibility &amp; Account Responsibilities
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  Minimum Age: You must be at least 18 years of age (or the legal age of digital consent in your jurisdiction) to create an account or use our Services.
                </p>
                <p className="leading-[24px] mb-0" aria-hidden="true">
                  &nbsp;
                </p>
                <p className="leading-[24px] mb-0">
                  Account Credentials: You are responsible for maintaining the confidentiality of your login credentials and for all actions taking place under your account.
                </p>
                <p className="leading-[24px] mb-0" aria-hidden="true">
                  &nbsp;
                </p>
                <p className="leading-[24px]">
                  Accurate Information: You agree to provide accurate, current, and complete details during account setup and maintain updated account information.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19517"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                2. Data Protection &amp; Regulatory Compliance
              </h2>
              <p className="font-['Inter_Tight',sans-serif] leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                We handle personal information in strict compliance with the EU General Data Protection Regulation (GDPR) and the Nigeria Data Protection Act (NDPA) / NDPR.
              </p>

              <div className="h-px w-full bg-[#e8e8e8] dark:bg-[#1a1a1a]" />

              <div
                className="flex flex-col gap-[12px] items-start relative shrink-0 w-full"
                data-node-id="178386:19683"
              >
                <div className="flex flex-col md:flex-row font-['Geist_Mono',monospace] items-start justify-between text-[#f13030] text-[12px] tracking-[1.26px] uppercase w-full gap-2">
                  <div className="shrink-0 whitespace-nowrap">
                    <p className="leading-normal">Compliance Area</p>
                  </div>
                  <div className="w-full md:w-[489px] shrink-0">
                    <p className="leading-normal">Overview of Protections &amp; Rights</p>
                  </div>
                </div>

                {COMPLIANCE_ROWS.map((row) => (
                  <div
                    key={row.area}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between relative rounded-[20px] shrink-0 w-full gap-2 md:gap-4"
                  >
                    <div className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] shrink-0 md:w-[230px]">
                      {row.area}
                    </div>
                    <p className="font-['Inter_Tight',sans-serif] leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[489px] shrink-0">
                      {row.overview}
                    </p>
                  </div>
                ))}
              </div>

              <div className="h-px w-full bg-[#e8e8e8] dark:bg-[#1a1a1a]" />

              <p className="font-['Inter_Tight',sans-serif] leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                For complete details regarding our data collection, processing, and security practices, please consult our dedicated Privacy Policy.
              </p>
            </div>

            {/* Card 3 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19608"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                3. Prohibited Conduct &amp; Acceptable Use
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  When using our Services, you agree not to:
                </p>
                <p className="leading-[24px] mb-0" aria-hidden="true">
                  &nbsp;
                </p>
                <ul className="list-disc ms-[24px] space-y-1">
                  <li className="leading-[24px]">
                    Violate any local, national, or international laws, including applicable Nigerian cybercrime legislation and European privacy laws.
                  </li>
                  <li className="leading-[24px]">
                    Copy, modify, decompile, or attempt to extract source code from our software or website.
                  </li>
                  <li className="leading-[24px]">
                    Engage in automated web scraping, data mining, or unauthorized API interactions.
                  </li>
                  <li className="leading-[24px]">
                    Distribute viruses, malware, trojans, or any disruptive digital content.
                  </li>
                  <li className="leading-[24px]">
                    Impersonate any person, entity, or representative of Monologg.
                  </li>
                  <li className="leading-[24px]">
                    Circumvent or attempt to disable security protocols, access controls, or platform limitations.
                  </li>
                </ul>
              </div>
            </div>

            {/* Card 4 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19591"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                4. Intellectual Property Rights
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  All branding, user interface design, domain names, logos, software code, written content, and visual assets associated with Monologg are the exclusive property of the Company or its licensors.
                </p>
                <p className="leading-[24px] mb-0" aria-hidden="true">
                  &nbsp;
                </p>
                <p className="leading-[24px]">
                  We grant you a personal, revocable, non-exclusive, non-transferable, and limited license to access and use the platform strictly in accordance with these Terms.
                </p>
              </div>
            </div>

            {/* Card 5 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19584"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                5. User Content &amp; Licensing
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  Ownership: You retain ownership of any text, files, or media submitted or uploaded through the Services (&quot;User Content&quot;).
                </p>
                <p className="leading-[24px] mb-0">
                  Operating License: By uploading content, you grant Monologg a worldwide, non-exclusive, royalty-free license to host, process, and display your User Content solely as required to operate and deliver the Services to you.
                </p>
                <p className="leading-[24px]">
                  Content Guarantee: You confirm that you hold all rights, licenses, and permissions necessary to publish and share your User Content.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19577"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                6. Subscriptions, Fees &amp; Payment
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  Payment Terms: Certain features or service tiers may require recurring subscription fees or single payments. Fees are displayed clearly prior to checkout.
                </p>
                <p className="leading-[24px] mb-0">
                  Taxation: Unless stated otherwise, prices are exclusive of statutory taxes (such as Value Added Tax / VAT), which will be applied where applicable by law.
                </p>
                <p className="leading-[24px]">
                  Refund Policy: All purchases are governed by the refund rules presented at the point of transaction.
                </p>
              </div>
            </div>

            {/* Card 7 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19570"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                7. Third-Party Links &amp; Services
              </h2>
              <p className="font-['Inter_Tight',sans-serif] leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                Our platform may include links or integrations to external services, websites, or software. Monologg does not control, endorse, or accept liability for any third-party content, terms, or privacy practices. Your interaction with third parties is conducted entirely at your own risk.
              </p>
            </div>

            {/* Card 8 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19526"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                8. Disclaimers &amp; Limitation of Liability
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  Service Availability: The Services are provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, whether express or implied.
                </p>
                <p className="leading-[24px] mb-0">
                  Limitation of Liability: To the maximum extent permitted by applicable law (including Nigerian contract law and mandatory consumer protections), Monologg and its officers shall not be liable for indirect, incidental, special, consequential, or punitive damages.
                </p>
                <p className="leading-[24px]">
                  Liability Cap: In all circumstances, Monologg&apos;s total cumulative liability to you shall not exceed the amount paid by you to the Company in the twelve (12) months prior to the event giving rise to the claim.
                </p>
              </div>
            </div>

            {/* Card 9 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19563"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                9. Indemnification
              </h2>
              <p className="font-['Inter_Tight',sans-serif] leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                You agree to defend, indemnify, and hold harmless Monologg, its directors, employees, and affiliates against any third-party claims, liabilities, losses, costs, or expenses (including reasonable attorney fees) resulting from your breach of these Terms, misuse of the platform, or violation of third-party rights.
              </p>
            </div>

            {/* Card 10 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19556"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                10. Suspension &amp; Termination
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full">
                <p className="leading-[24px] mb-0">
                  Termination by User: You may cancel your account at any time by accessing your account settings or contacting support.
                </p>
                <p className="leading-[24px]">
                  Termination by Company: We reserve the right to suspend or close your account immediately if you breach these Terms, engage in unlawful activities, or if requested by law enforcement or regulatory bodies.
                </p>
              </div>
            </div>

            {/* Card 11 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19533"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                11. Governing Law &amp; Dispute Resolution
              </h2>
              <div className="font-['Inter_Tight',sans-serif] font-semibold text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full space-y-2">
                <p className="leading-[24px] mb-0">
                  Governing Law: These Terms are governed by and construed in accordance with the laws of the Federal Republic of Nigeria.
                </p>
                <p className="leading-[24px] mb-0">
                  Dispute Resolution: Any dispute, disagreement, or claim arising out of these Terms shall first be addressed through informal, good-faith negotiations. If unresolved within 30 days, the matter shall be referred to arbitration or resolved in competent courts within Nigeria.
                </p>
                <p className="leading-[24px] mb-0">
                  Mandatory Statutory Rights: Nothing in these provisions waives statutory consumer protections that cannot be contractually excluded under applicable local law.
                </p>
              </div>
            </div>

            {/* Card 12 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178385:19540"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                12. Modifications to Terms
              </h2>
              <p className="font-['Inter_Tight',sans-serif] leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                We may update these Terms periodically to align with legal, technical, or operational updates. Material modifications will be communicated by updating the date at the top of this document or via platform notifications. Continued use of the platform after updates indicates acceptance of the amended Terms.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* ── Cookie Policy (Figma 178383:18857) ── */
        <main
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-6 md:px-16 xl:px-[200px] py-[112px] relative shrink-0 w-full z-10"
          data-node-id="178383:18916"
        >
          {/* Hero Header */}
          <div
            className="flex flex-col items-center relative shrink-0 w-full max-w-[1040px]"
            data-node-id="178383:18930"
          >
            <div className="flex flex-col gap-[20px] items-center relative shrink-0 w-full">
              <div className="flex flex-col gap-[12px] items-center relative shrink-0">
                <div className="flex gap-[10px] items-center justify-center relative shrink-0">
                  <div className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid rounded-full shrink-0 size-[8px]" />
                  <p className="font-['Geist_Mono',monospace] text-[#f13030] text-[14px] tracking-[1.26px] uppercase whitespace-nowrap leading-normal">
                    Effective Date: October 29, 2026
                  </p>
                </div>
                <h1 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-3xl sm:text-5xl md:text-[64px] text-center tracking-[-1.92px] leading-tight sm:leading-none">
                  Cookie Policy
                </h1>
              </div>

              <p className="leading-[24px] text-[#767676] dark:text-[#a3a3a3] font-['Inter_Tight',sans-serif] text-[16px] text-center tracking-[0.48px] max-w-[664px] w-full">
                This Cookie Policy forms an integral part of our Terms of Service. It details how cookies, tracking pixels, local storage, and similar technologies are utilized when you access our platform, website, and associated applications.
              </p>
            </div>
          </div>

          {/* 7 Section Cards */}
          <div
            className="flex flex-col gap-[40px] items-start relative shrink-0 w-full max-w-[911px]"
            data-node-id="178387:19707"
          >
            {/* Card 1 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19791"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                1. Scope &amp; Relationship to Terms of Service
              </h2>
              <p className="leading-[24px] font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                By accessing or using our platform, you acknowledge and agree that cookies and local data storage technologies may be stored on your device in accordance with this policy. Your continued use of the platform is subject to the terms outlined here and in our Terms of Service.
              </p>
            </div>

            {/* Card 2 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19798"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                2. What Are Cookies?
              </h2>
              <p className="leading-[24px] font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                Cookies are small text files placed on your browser or hardware device when visiting a online service. They allow platforms to retain session state, save user settings, deliver personalized experiences, and gather aggregate statistical insights regarding site usage and performance.
              </p>
            </div>

            {/* Card 3 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19715"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                3. Cookie Categories &amp; Settings
              </h2>
              <p className="leading-[24px] font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                We classify the cookies utilized on our platform into four main categories based on function and consent requirements:
              </p>
              <ul className="list-disc font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full space-y-1">
                <li className="mb-0 ms-[24px] leading-[24px]">
                  Strictly Necessary Cookies: Required for basic operational functions, secure authentication, session persistence, and system integrity. These cookies are essential to fulfill services requested under our Terms of Service and cannot be disabled in our preference systems.
                </li>
                <li className="mb-0 ms-[24px] leading-[24px]">
                  Performance &amp; Analytics Cookies: Collect aggregated data on how users navigate and interact with our platform. These insights help us analyze error reports, page performance, and overall system scalability.
                </li>
                <li className="mb-0 ms-[24px] leading-[24px]">
                  Functional Cookies: Store user preferences (such as display theme, language settings, and regional configurations) to provide a tailored and consistent user experience.
                </li>
                <li className="ms-[24px] leading-[24px]">
                  Targeting &amp; Advertising Cookies: Placed by our platform or verified third-party partners to monitor user engagement across pages and deliver customized communications or promotional content.
                </li>
              </ul>
            </div>

            {/* Card 4 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19853"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                4. Summary of Cookies Used
              </h2>

              <div className="h-px w-full bg-[#e8e8e8] dark:bg-[#1a1a1a]" />

              <div
                className="flex flex-col gap-[12px] items-start relative shrink-0 w-full overflow-x-auto"
                data-node-id="178387:19860"
              >
                <div className="flex font-['Geist_Mono',monospace] items-start justify-between text-[#f13030] text-[12px] tracking-[1.26px] uppercase min-w-[760px] w-full">
                  <div className="w-[136px] shrink-0">
                    <p className="leading-normal mb-0">Cookie </p>
                    <p className="leading-normal">Identifier</p>
                  </div>
                  <div className="w-[143px] shrink-0">
                    <p className="leading-normal">Category</p>
                  </div>
                  <div className="w-[312px] shrink-0">
                    <p className="leading-normal">Primary Purpose</p>
                  </div>
                  <div className="w-[90px] shrink-0">
                    <p className="leading-normal">Duration</p>
                  </div>
                  <div className="w-[90px] shrink-0">
                    <p className="leading-normal">type</p>
                  </div>
                </div>

                {COOKIE_SUMMARY_ROWS.map((cookie) => (
                  <div
                    key={cookie.id}
                    className="flex items-center justify-between min-w-[760px] w-full text-[14px] py-1 border-b border-[#f5f5f5] dark:border-[#1a1a1a] last:border-b-0"
                  >
                    <div className="w-[136px] shrink-0 font-['Geist_Mono',monospace] text-[#1a1a1a] dark:text-[#f9f9f9] font-medium">
                      {cookie.id}
                    </div>
                    <div className="w-[143px] shrink-0 font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3]">
                      {cookie.category}
                    </div>
                    <div className="w-[312px] shrink-0 font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3]">
                      {cookie.purpose}
                    </div>
                    <div className="w-[90px] shrink-0 font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3]">
                      {cookie.duration}
                    </div>
                    <div className="w-[90px] shrink-0 font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3]">
                      {cookie.type}
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px w-full bg-[#e8e8e8] dark:bg-[#1a1a1a]" />
            </div>

            {/* Card 5 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19805"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                5. Managing Your Preferences
              </h2>
              <div className="font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] w-full flex flex-col gap-[16px]">
                <p className="leading-[24px] mb-0">
                  You maintain control over non-essential cookies on our platform. You may adjust your choices at any time through the following methods:
                </p>
                <div className="flex flex-col gap-[2px]">
                  <p className="font-['Inter_Tight',sans-serif] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] leading-[24px] mb-0">
                    In-App Consent Preferences
                  </p>
                  <p className="leading-[24px] mb-0">
                    You can update your cookie settings by accessing the interactive Cookie Preference Center available in your Account Settings or the footer of our web application.
                  </p>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <p className="font-['Inter_Tight',sans-serif] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] leading-[24px] mb-0">
                    Web Browser Controls
                  </p>
                  <p className="leading-[24px] mb-2">
                    Most internet browsers allow you to modify cookie handling rules via their settings menus. You can instruct your browser to refuse all cookies, prompt before accepting a cookie, or delete existing local storage data:
                  </p>
                  <div className="flex flex-col gap-[2px] text-[#767676] dark:text-[#a3a3a3]">
                    <p className="leading-[24px] mb-0">Google Chrome: Settings → Privacy and Security → Cookies and other site data</p>
                    <p className="leading-[24px] mb-0">Mozilla Firefox: Preferences → Privacy &amp; Security → Cookies and Site Data</p>
                    <p className="leading-[24px] mb-0">Apple Safari: Preferences → Privacy → Manage Website Data</p>
                    <p className="leading-[24px] mb-0">Microsoft Edge: Settings → Site permissions → Cookies and site data</p>
                  </div>
                </div>
                <p className="leading-[24px] mb-0">
                  Note: Rejecting or disabling strictly necessary cookies may restrict access to essential account features and cause platform instability.
                </p>
              </div>
            </div>

            {/* Card 6 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19812"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                6. Third-Party Integrations
              </h2>
              <p className="leading-[24px] font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                Some features incorporated within our services—such as embedded media players, secure payment gateways, and authentication providers—may issue cookies directly from their external domains. The management of those cookies is governed by the respective privacy policies of those third-party providers.
              </p>
            </div>

            {/* Card 7 */}
            <div
              className={CARD_CLASSES}
              data-node-id="178387:19819"
            >
              <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                7. Updates to This Policy
              </h2>
              <p className="leading-[24px] font-['Inter_Tight',sans-serif] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full">
                We may update this Cookie Policy periodically to maintain alignment with technological modifications, operational requirements, or changing legal obligations. Any updates will become effective upon publication on this page with an updated effective date.
              </p>
            </div>
          </div>
        </main>
      )}

      {/* ── Dashed Horizontal Divider (178190:30825) ── */}
      <div className="h-0 relative shrink-0 w-full overflow-hidden my-0" data-node-id="178190:30825">
        <div className="relative w-full h-[2px]">
          <img alt="" className="block w-full h-full object-cover" src={ASSETS.dashedDivider} />
        </div>
      </div>

      {/* ── 4. Shared Website Footer (Figma Frame 178151:50146) ── */}
      <WebsiteFooter />
    </div>
  );
}
