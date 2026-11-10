import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Avatar } from "../components/ui/Avatar";
import { WebsiteFooter } from "../components/ui/WebsiteFooter";
import { PerformerAvatarRow } from "../components/PerformerAvatarRow";
import { TopAnnouncementBar } from "../components/TopAnnouncementBar";
import { useTheme } from "../Root";
import { appStateSync } from "../../lib/state-sync";
import { apiClient } from "../../lib/api-client";
import {
  BespokeMobileNavDrawer,
  MobileMenuButton,
} from "../components/BespokeMobileNav";
import {
  ChevronDown,
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

const ASSETS = {
  logoMask: "/assets/pricing/logo-mask.svg",
  logoIcon: "/assets/pricing/logo-icon.svg",
  logoWordmark: "/assets/pricing/logo-wordmark.svg",
  themeToggle: "/assets/pricing/theme-toggle.svg",
  arrowRight: "/assets/pricing/arrow-right.svg",
  studioVimeo: "/assets/pricing/studio-vimeo.svg",
  studioNetflix: "/assets/pricing/studio-netflix.svg",
  studioAmazonPrime: "/assets/pricing/studio-amazon-prime.svg",
  studioDisney: "/assets/pricing/studio-disney.svg",
  studioHulu: "/assets/pricing/studio-hulu.svg",
  studioTwitch: "/assets/pricing/studio-twitch.svg",
  dashedDivider: "/assets/pricing/dashed-divider.svg",
  faqPlus: "/assets/pricing/faq-plus.svg",
  faqX: "/assets/pricing/faq-x.svg",
};

export function PricingPage() {
  const navigate = useNavigate();
  const { toggle } = useTheme();

  const [loggedInUser, setLoggedInUser] = useState(appStateSync.getLoggedInUser());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [activeAudience, setActiveAudience] = useState<"performers" | "clients">("performers");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    try {
      window.scrollTo?.(0, 0);
    } catch {}
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

  const handleAudienceClick = (type: "performers" | "clients") => {
    setActiveAudience(type);
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

  // Client studio badges (6 items — Figma 178359:18133)
  const studioBadges = [
    { name: "Vimeo", src: ASSETS.studioVimeo, nodeId: "178359:18134" },
    { name: "Netflix", src: ASSETS.studioNetflix, nodeId: "178359:18136" },
    { name: "Amazon Prime", src: ASSETS.studioAmazonPrime, nodeId: "178359:18138" },
    { name: "Disney+", src: ASSETS.studioDisney, nodeId: "178359:18140" },
    { name: "Hulu", src: ASSETS.studioHulu, nodeId: "178359:18142" },
    { name: "Twitch", src: ASSETS.studioTwitch, nodeId: "178359:18144" },
  ];

  // For Performers comparison rows (Figma 178359:18050)
  const performerRows = [
    {
      nodeId: "178359:18061",
      feature: "Completed Booking Fee",
      freeTier: "7% per booking",
      proTier: "5% per booking (Save a little over 28% on fees)",
      firstRowBorder: true,
    },
    {
      nodeId: "178359:18068",
      feature: "Bio Storefront & Media Hosting",
      freeTier: "Standard Storefront (Video/Audio)",
      proTier: "Custom Domain (name.monologg.co)",
    },
    {
      nodeId: "178359:18075",
      feature: "Profile & Customer Analytics",
      freeTier: "Limited",
      proTier: "Deep Traffic Sources & Conversion Analytics",
    },
    {
      nodeId: "178359:18082",
      feature: "24/7 AI Profile Agent (Thespian)",
      freeTier: "Included",
      proTier: "Priority AI Search Indexing",
    },
    {
      nodeId: "178359:18089",
      feature: "Audition & Calendar Bookings",
      freeTier: "Direct Calendar Sync",
      proTier: "Direct Calendar Sync + Auto-Booking",
    },
    {
      nodeId: "178359:18096",
      feature: "Milestone Escrow Protection",
      freeTier: "Included",
      proTier: "Included",
    },
    {
      nodeId: "178359:18103",
      feature: "Interactive AI Line-Reader & Rehearsals",
      freeTier: "---",
      proTier: "included",
    },
    {
      nodeId: "178359:18110",
      feature: "Automated Press Kit (EPK) Generator",
      freeTier: "Included",
      proTier: "Unlimited Pro EPK Exports",
    },
    {
      nodeId: "178359:18117",
      feature: "Verified Artist Badge",
      freeTier: "---",
      proTier: "Verified Pro Badge",
    },
  ];

  // For Clients comparison rows & category headers (Figma 178359:18148)
  const clientRows: (
    | { isHeader: true; nodeId: string; title: string; weight?: "semibold" | "medium" }
    | { isHeader?: false; nodeId: string; feature: string; freeTier: string; proTier: string }
  )[] = [
    {
      nodeId: "178359:18159",
      feature: "Monthly Subscription",
      freeTier: "$0 / month",
      proTier: "$20 / seat / month",
    },
    {
      nodeId: "178359:18166",
      feature: "Client Service Fee",
      freeTier: "9% per booking",
      proTier: "5% per booking",
    },
    {
      nodeId: "178359:18173",
      feature: "Contract Initiation Fee",
      freeTier: "$0",
      proTier: "$0",
    },
    // Category 1
    {
      isHeader: true,
      nodeId: "178359:18180",
      title: "Discover Trusted Performers",
      weight: "semibold",
    },
    {
      nodeId: "178359:18185",
      feature: "Global Performer Pool Access",
      freeTier: "Full Access",
      proTier: "Full Access",
    },
    {
      nodeId: "178359:18192",
      feature: "ID-Verified Performer Profiles",
      freeTier: "Included",
      proTier: "Included",
    },
    {
      nodeId: "178359:18199",
      feature: "Verified Reviews & Work History",
      freeTier: "Included",
      proTier: "Included",
    },
    {
      nodeId: "178359:18206",
      feature: "Expert-Vetted Talent Pool",
      freeTier: "Standard",
      proTier: "Priority Access",
    },
    // Category 2
    {
      isHeader: true,
      nodeId: "178359:18213",
      title: "Move Faster with Thespian AI",
      weight: "semibold",
    },
    {
      nodeId: "178359:18218",
      feature: "Auto-Invite Top Candidates",
      freeTier: "---",
      proTier: "Up to 100",
    },
    {
      nodeId: "178359:18225",
      feature: "Curated AI Shortlists",
      freeTier: "---",
      proTier: "Delivered in < 2 hrs",
    },
    {
      nodeId: "178359:18232",
      feature: "Script & PDF Parsing",
      freeTier: "---",
      proTier: "Included",
    },
    // Category 3
    {
      isHeader: true,
      nodeId: "178359:18239",
      title: "Analytics & Reporting",
      weight: "semibold",
    },
    {
      nodeId: "178359:18246",
      feature: "Spend & Escrow Reporting",
      freeTier: "Standard Reports",
      proTier: "Automated Export & ERP",
    },
    // Category 4
    {
      isHeader: true,
      nodeId: "178359:18253",
      title: "Engage & Contract Candidates",
      weight: "semibold",
    },
    {
      nodeId: "178359:18261",
      feature: "Performer Invites Per Brief Post",
      freeTier: "30 Invites",
      proTier: "Unlimited Invites",
    },
    {
      nodeId: "178359:18268",
      feature: "Direct Messages Per Day",
      freeTier: "15 messages/day",
      proTier: "Unlimited",
    },
    // Category 5
    {
      isHeader: true,
      nodeId: "178359:18275",
      title: "Collaborate & Management",
      weight: "medium",
    },
    {
      nodeId: "178359:18282",
      feature: "Real-Time Chat, Video & Audition Calls",
      freeTier: "Built-in (15mins per call)",
      proTier: "Built-in (15mins per call)",
    },
    {
      nodeId: "178359:18289",
      feature: "Milestone Escrow & Dispute Protection",
      freeTier: "Included",
      proTier: "Included",
    },
    {
      nodeId: "178359:18296",
      feature: "Multi-User Team Seats",
      freeTier: "1 Seat",
      proTier: "Up to 5 Seats",
    },
    {
      nodeId: "178359:18303",
      feature: "Custom Roles & Billing Permissions",
      freeTier: "Basic",
      proTier: "Advanced",
    },
    {
      nodeId: "178359:18310",
      feature: "Unified Invoicing & HRIS Compliance",
      freeTier: "Standard Invoices",
      proTier: "Advanced",
    },
  ];

  // 10 Accordion FAQ items (Figma 178359:18323)
  const faqs = [
    {
      question: "What is Monologg and how does it work?",
      answer:
        "Monologg is like Upwork for Actors, Public speakers, Comperes, Comedians, Streamers, Artists, Musicians, and Creators. Performers get a personalized link to showcase their work, set prices, and manage bookings. Clients such as studios, directors, and event organizers use it to find verified talent, post jobs, and pay securely through the platform.",
    },
    {
      question: "What currency does Monologg support?",
      answer:
        "Currently, all transactions are processed in Nigerian Naira (₦) through secure payment gateways such as Paystack. Future updates will include support for Dollar (USD) and Pound (GBP) payments.",
    },
    {
      question: "How does escrow payment protection work?",
      answer:
        "To ensure safety for all parties, clients deposit the agreed payment into an escrow account managed by Monologg before the performance begins. Once the job is completed and both parties provide feedback, the funds are released to the performer immediately.",
    },
    {
      question: "What are the platform fees?",
      answer:
        "Monologg charges a total fee of 16% for each booking, divided between performers and clients: 7% deducted from performer earnings, which is less than the typical 20% to 25% taken by traditional agents; clients bear an additional 9% on their invoices to ensure payment protection.",
    },
    {
      question: "How does Thespian AI work?",
      answer:
        "When performers upload their monologues or voice reels, Thespian AI analyzes the audio to identify key elements like accent, emotional tone, comedic timing, and performance style, automatically tagging the profile with relevant descriptors.",
    },
    {
      question: "What data can performers see?",
      answer:
        "Performers are provided with a user-friendly dashboard that tracks metrics such as profile views, video plays, traffic sources (e.g., Instagram, TikTok), and revenue generated from various packages.",
    },
    {
      question: "How does Monologg ensure safety for payments?",
      answer:
        "Monologg uses an escrow system to secure payments. Funds are held safely until the performer completes the job or delivers the shoutout, ensuring that clients only pay for work they approve.",
    },
    {
      question: "What features does Monologg offer to performers?",
      answer:
        "Performers can create personalized profiles, upload portfolios, set their own rates, and manage bookings seamlessly. They can also receive feedback from clients and showcase their experience, increasing their visibility and opportunities.",
    },
    {
      question: "How does Monologg support communication between clients and performers?",
      answer:
        "Monologg features an integrated messaging system that allows clients and performers to communicate directly, discuss project details, and finalize arrangements efficiently.",
    },
    {
      question: "What type of gigs can clients post on Monologg?",
      answer:
        "Clients can post a variety of gigs ranging from acting roles, public speaking events, and comedy performances to music gigs and custom video requests, catering to diverse entertainment needs.",
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col bg-white dark:bg-[#000000] text-[#1a1a1a] dark:text-[#f9f9f9] font-sans antialiased overflow-x-clip relative isolate"
      data-node-id="178359:17960"
    >
      {/* ── 1. Top Announcement Bar (178359:17961) ── */}
      <TopAnnouncementBar nodeId="178359:17961" />

      {/* ── 2. Sticky Header (178359:17973) ── */}
      <header
        className="backdrop-blur-[12px] bg-white/95 dark:bg-[#000000]/95 border-[#e8e8e8] dark:border-[#1a1a1a] border-b border-solid flex h-[68px] items-center justify-between px-4 sm:px-8 lg:px-[64px] shrink-0 sticky top-0 w-full z-50 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)]"
        data-node-id="178359:17973"
      >
        <div
          className="flex gap-[12px] items-center relative shrink-0"
          data-node-id="178359:17975"
        >
          {/* Figma Masked Monologg Logo (178359:17976) */}
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Monologg Home"
            className="h-[24px] overflow-clip relative shrink-0 w-[105.109px] cursor-pointer"
            data-node-id="178359:17976"
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
            data-node-id="178359:17988"
          >
            <button
              onClick={() => navigate("/product")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
              data-node-id="178359:17989"
            >
              Product
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#f25757] text-[12px] leading-[16px] transition-colors whitespace-nowrap flex items-center gap-[10px] cursor-pointer"
              data-node-id="178359:17991"
            >
              <span
                className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid rounded-full shrink-0 size-[8px]"
                data-node-id="178359:17993"
              />
              <span data-node-id="178359:17994">Pricing</span>
            </button>
            <button
              onClick={() => navigate("/resources")}
              className="px-[16px] py-[6px] rounded-full font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap cursor-pointer"
              data-node-id="178359:17995"
            >
              Resources
            </button>
          </nav>
        </div>

        <div
          className="flex gap-[12px] items-center relative shrink-0"
          data-node-id="178359:17999"
        >
          <button
            onClick={toggle}
            className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid rounded-full shrink-0 size-[36px] flex items-center justify-center hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
            aria-label="Toggle theme"
            data-node-id="178359:18000"
          >
            <div className="relative shrink-0 size-[16px]" data-node-id="178359:18001">
              <img
                alt=""
                className="absolute block inset-0 max-w-none size-full"
                src={ASSETS.themeToggle}
              />
            </div>
          </button>

          {loggedInUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-full p-1 pr-2 border border-[#e8e8e8] dark:border-[#1a1a1a] bg-white dark:bg-[#000000] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-all active:scale-95 shadow-sm"
                aria-label="Account menu"
              >
                <Avatar
                  size="sm"
                  src={userAvatarUrl ?? undefined}
                  background="#F13030"
                  color="#FFFFFF"
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
                        background="#F13030"
                        color="#FFFFFF"
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
                          onClick={() => {
                            setShowUserMenu(false);
                            navigate(item.path);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors"
                        >
                          <item.icon className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="py-1.5 border-t border-[#e8e8e8] dark:border-[#1a1a1a]">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[#F13030] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors font-medium"
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
            <div className="flex items-center gap-[12px]">
              <button
                onClick={() => navigate("/auth?mode=signin")}
                className="border border-[#d1d1d1] dark:border-[#1a1a1a] border-solid rounded-full h-[40px] px-[20px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[16px] tracking-[-0.12px] text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer whitespace-nowrap"
                data-node-id="178359:18003"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-[#f13030] hover:bg-[#d31f20] text-white rounded-full h-[40px] px-[20px] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] leading-[16px] tracking-[-0.12px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                data-node-id="178359:18005"
              >
                Sign up free
              </button>
            </div>
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
        activePage="pricing"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        loggedInUser={loggedInUser}
        displayName={loggedInUser?.name}
        displayAvatar={userAvatarUrl ?? undefined}
        isClientSession={loggedInUser?.userType === "CLIENT"}
        onSignOut={handleSignOut}
      />


      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col items-center w-full relative z-10">
        {/* ── 3. Pricing Hero Section (178359:18019) ── */}
        <section
          className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border-b border-transparent dark:border-[#1a1a1a] flex flex-col items-center px-6 py-16 lg:p-[112px] relative w-full"
          data-node-id="178359:18019"
        >
          <div
            className="flex flex-col gap-[32px] items-center relative w-full max-w-[1216px]"
            data-node-id="178359:18020"
          >
            <div
              className="flex flex-col gap-[20px] items-center relative"
              data-node-id="178359:18021"
            >
              <div className="flex flex-col items-center relative" data-node-id="178359:18022">
                <h1
                  className="font-['Switzer',sans-serif] font-medium text-[48px] sm:text-[64px] leading-none tracking-[-1.92px] text-[#1a1a1a] dark:text-[#f9f9f9] text-center whitespace-nowrap"
                  data-node-id="178359:18023"
                >
                  Pricing
                </h1>
              </div>
              <p
                className="font-['Inter_Tight',sans-serif] font-normal text-[18px] leading-[26px] tracking-[0.54px] text-[#767676] dark:text-[#a3a3a3] text-center max-w-[664px]"
                data-node-id="178359:18024"
              >
                Simple, transparent pricing designed to maximize direct opportunities while
                protecting project payouts.
              </p>
            </div>
            <div className="flex items-center relative" data-node-id="178359:18025">
              <button
                onClick={() =>
                  navigate(
                    loggedInUser
                      ? activeAudience === "performers"
                        ? "/dashboard"
                        : "/client"
                      : activeAudience === "performers"
                      ? "/auth?mode=signup&role=talent"
                      : "/auth?mode=signup&role=client"
                  )
                }
                className="bg-[#f13030] hover:bg-[#d31f20] text-white flex gap-[8px] h-[40px] items-center justify-center px-[24px] py-[8px] rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all active:scale-95 cursor-pointer"
                data-node-id="178359:18026"
              >
                <span
                  className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] leading-[16px] tracking-[-0.12px] text-white whitespace-nowrap"
                  data-node-id="178359:18028"
                >
                  Get started for free
                </span>
                <div className="relative shrink-0 size-[16px]" data-node-id="178359:18029">
                  <img
                    alt=""
                    className="absolute block inset-0 max-w-none size-full"
                    src={ASSETS.arrowRight}
                  />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ── 4. Active Audience Comparison Section (Performers 178359:18031 | Clients 178359:18130) ── */}
        {activeAudience === "performers" ? (
          <section
            id="performers"
            className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-4 sm:px-8 lg:px-[200px] py-16 lg:py-[112px] relative w-full"
            data-node-id="178359:18031"
          >
            <div
              className="flex flex-col gap-[24px] items-center relative shrink-0 w-full max-w-[688px]"
              data-node-id="178401:153036"
            >
              {/* Audience Pill — Performers Active (178359:18032) */}
              <div
                className="flex gap-[8px] items-center p-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-full border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:18032"
              >
                <button
                  type="button"
                  aria-label="Performers"
                  onClick={() => handleAudienceClick("performers")}
                  className="flex gap-[8px] items-center px-4 py-1.5 rounded-full bg-white dark:bg-[#333333] text-[#1a1a1a] dark:text-[#f9f9f9] shadow-sm font-semibold transition-all duration-200 cursor-pointer"
                  data-node-id="178401:153035"
                >
                  <div
                    className="bg-[#1a1a1a] dark:bg-[#f9f9f9] border border-[rgba(0,0,0,0.4)] dark:border-white/40 border-solid relative rounded-full shrink-0 size-[8px]"
                    data-node-id="178359:18033"
                  />
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#1a1a1a] dark:text-[#f9f9f9] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:18034"
                  >
                    PERFORMER
                  </span>
                </button>
                <span
                  className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#bababa] dark:text-[#767676] tracking-[1.26px] uppercase whitespace-nowrap"
                >
                  |
                </span>
                <button
                  type="button"
                  aria-label="Clients"
                  onClick={() => handleAudienceClick("clients")}
                  className="flex gap-[8px] items-center px-4 py-1.5 rounded-full text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer"
                  data-node-id="178359:18036"
                >
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                  >
                    CLIENT
                  </span>
                </button>
              </div>

              {/* Avatars + Heading + Subtitle (178359:18037) */}
              <div
                className="flex flex-col gap-[20px] items-center relative shrink-0 w-full max-w-[688px]"
                data-node-id="178359:18037"
              >
                <div
                  className="flex flex-col gap-[12px] items-center relative shrink-0"
                  data-node-id="178359:18038"
                >
                  {/* 5 Overlapping Performer Avatars with Caveat Hover Names & Focus Blur (Figma 178450:156007 & 178450:156023) */}
                  <PerformerAvatarRow assetPrefix="pricing" data-node-id="178448:155893" />

                  <h2
                    className="font-['Switzer',sans-serif] font-medium text-[36px] sm:text-[48px] leading-[48px] tracking-[-1.44px] text-[#1a1a1a] dark:text-[#f9f9f9] text-center whitespace-nowrap"
                    data-node-id="178359:18048"
                  >
                    For Performers
                  </h2>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal text-[18px] leading-[26px] tracking-[0.54px] text-[#767676] dark:text-[#a3a3a3] text-center"
                  data-node-id="178359:18049"
                >
                  Keep 93% of your booking and shoutout revenue with zero agent commissions
                  (compared to traditional 20%+ agency fees or Cameo&apos;s 25% platform cut).
                </p>
              </div>
            </div>

            {/* Performers 3-Column Comparison Table (178359:18050) */}
            <div
              className="flex flex-col items-start overflow-x-auto relative shrink-0 w-full max-w-[1040px]"
              data-node-id="178359:18050"
            >
              <div className="min-w-[680px] w-full flex flex-col">
                {/* Header Row (178359:18051) */}
                <div
                  className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] flex items-start relative shrink-0 w-full"
                  data-node-id="178359:18051"
                >
                  <div
                    className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative"
                    data-node-id="178359:18052"
                  >
                    <span
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[21px] tracking-[-0.48px] whitespace-nowrap"
                      data-node-id="178359:18053"
                    >
                      Feature / Capability
                    </span>
                  </div>
                  <div
                    className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative"
                    data-node-id="178359:18054"
                  >
                    <span
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[21px] tracking-[-0.48px] whitespace-nowrap"
                      data-node-id="178359:18055"
                    >
                      Free Tier
                    </span>
                  </div>
                  <div
                    className="flex gap-[24px] items-center pb-[17px] pt-[16px] px-[16px] relative shrink-0 w-[388px]"
                    data-node-id="178359:18056"
                  >
                    <span
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[21px] tracking-[-0.48px] whitespace-nowrap"
                      data-node-id="178359:18057"
                    >
                      Monologg Pro
                    </span>
                    <div
                      className="flex gap-[10px] items-center justify-center relative shrink-0"
                      data-node-id="178359:18058"
                    >
                      <span
                        className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid rounded-full shrink-0 size-[8px]"
                        data-node-id="178359:18059"
                      />
                      <span
                        className="font-['Geist_Mono',monospace] font-normal text-[#f13030] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                        data-node-id="178359:18060"
                      >
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>

                {/* 9 Data Rows with Blur-in Entrance & Micro-Interaction */}
                {performerRows.map((row, idx) => (
                  <motion.div
                    key={row.nodeId}
                    initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
                    whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                    viewport={{ once: true, amount: 0.1 }}
                    transition={{
                      duration: 0.35,
                      delay: idx * 0.03,
                      ease: [0.4, 0, 0.2, 1],
                    }}
                    className="border-[#e8e8e8] dark:border-[#1a1a1a] border-solid border-t flex items-center pt-px relative shrink-0 w-full hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors duration-150 cursor-pointer"
                    data-node-id={row.nodeId}
                  >
                    <div className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative">
                      <span className="font-['Inter_Tight',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] leading-[17px] tracking-[0.42px] whitespace-nowrap">
                        {row.feature}
                      </span>
                    </div>
                    <div className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative">
                      <span className="font-['Inter_Tight',sans-serif] font-normal text-[#484848] dark:text-[#bababa] text-[14px] leading-[20.93px] tracking-[0.42px] whitespace-nowrap">
                        {row.freeTier}
                      </span>
                    </div>
                    <div className="flex flex-col items-start pb-[17px] pt-[16px] px-[16px] relative shrink-0 w-[388px]">
                      <span className="font-['Inter_Tight',sans-serif] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12.5px] leading-[15px] tracking-[0.375px] whitespace-nowrap">
                        {row.proTier}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* CTA Button Under Performers Table (178359:18124) */}
            <div className="flex items-center relative shrink-0" data-node-id="178359:18124">
              <button
                onClick={() => navigate(loggedInUser ? "/dashboard" : "/auth?mode=signup&role=talent")}
                className="bg-[#f13030] hover:bg-[#d31f20] text-white flex gap-[8px] h-[40px] items-center justify-center px-[24px] py-[8px] rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all active:scale-95 cursor-pointer"
                data-node-id="178359:18125"
              >
                <span
                  className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] leading-[16px] tracking-[-0.12px] text-white whitespace-nowrap"
                  data-node-id="178359:18127"
                >
                  Get started for free
                </span>
                <div className="relative shrink-0 size-[16px]" data-node-id="178359:18128">
                  <img
                    alt=""
                    className="absolute block inset-0 max-w-none size-full"
                    src={ASSETS.arrowRight}
                  />
                </div>
              </button>
            </div>
          </section>
        ) : (
          <section
            id="clients"
            className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-4 sm:px-8 lg:px-[200px] py-16 lg:py-[112px] relative w-full"
            data-node-id="178359:18130"
          >
            <div
              className="flex flex-col gap-[20px] items-center relative shrink-0 w-full max-w-[688px]"
              data-node-id="178359:18131"
            >
              <div
                className="flex flex-col gap-[24px] items-center relative shrink-0"
                data-node-id="178401:153044"
              >
                {/* Audience Pill — Clients Active (178401:153037) */}
                <div
                  className="flex gap-[8px] items-center p-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-full border border-[#e8e8e8] dark:border-[#1a1a1a]"
                  data-node-id="178401:153037"
                >
                  <button
                    type="button"
                    aria-label="Performers"
                    onClick={() => handleAudienceClick("performers")}
                    className="flex gap-[8px] items-center px-4 py-1.5 rounded-full text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer"
                    data-node-id="178401:153042"
                  >
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                    >
                      PERFORMER
                    </span>
                  </button>
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#bababa] dark:text-[#767676] tracking-[1.26px] uppercase whitespace-nowrap"
                  >
                    |
                  </span>
                  <button
                    type="button"
                    aria-label="Clients"
                    onClick={() => handleAudienceClick("clients")}
                    className="flex gap-[8px] items-center px-4 py-1.5 rounded-full bg-white dark:bg-[#333333] text-[#1a1a1a] dark:text-[#f9f9f9] shadow-sm font-semibold transition-all duration-200 cursor-pointer"
                    data-node-id="178401:153038"
                  >
                    <div
                      className="bg-[#1a1a1a] dark:bg-[#f9f9f9] border border-[rgba(0,0,0,0.4)] dark:border-white/40 border-solid relative rounded-full shrink-0 size-[8px]"
                      data-node-id="178401:153039"
                    />
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#1a1a1a] dark:text-[#f9f9f9] tracking-[1.26px] uppercase whitespace-nowrap"
                      data-node-id="178401:153040"
                    >
                      CLIENT
                    </span>
                  </button>
                </div>

                {/* 6 Overlapping Studio Logos + Heading (178359:18132) */}
                <div
                  className="flex flex-col gap-[12px] items-center relative shrink-0"
                  data-node-id="178359:18132"
                >
                  <div
                    className="flex items-start relative shrink-0"
                    data-node-id="178359:18133"
                  >
                    {studioBadges.map((studio, i) => (
                      <div
                        key={studio.name}
                        className={`bg-[#f9f9f9] dark:bg-[#1a1a1a] border-[#e8e8e8] dark:border-[#1a1a1a] border-[0.354px] border-solid flex items-center ${
                          i < studioBadges.length - 1 ? "mr-[-15px]" : ""
                        } p-[11.323px] relative rounded-full shrink-0`}
                        data-node-id={studio.nodeId}
                        title={studio.name}
                      >
                        <div className="relative shrink-0 size-[22.646px]">
                          <img
                            alt={studio.name}
                            className="absolute block inset-0 max-w-none size-full dark:invert"
                            src={studio.src}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <h2
                    className="font-['Switzer',sans-serif] font-medium text-[36px] sm:text-[48px] leading-[48px] tracking-[-1.44px] text-[#1a1a1a] dark:text-[#f9f9f9] text-center whitespace-nowrap"
                    data-node-id="178359:18146"
                  >
                    For Clients
                  </h2>
                </div>
              </div>

              <p
                className="font-['Inter_Tight',sans-serif] font-normal text-[18px] leading-[26px] tracking-[0.54px] text-[#767676] dark:text-[#a3a3a3] text-center"
                data-node-id="178359:18147"
              >
                Choose the plan that fits your production scale. All client fees are structured
                on invoices as an Automated Casting, Escrow Protection, and Project Management
                Service Fee.
              </p>
            </div>

            {/* Clients 3-Column Comparison Table (178359:18148) */}
            <div
              className="flex flex-col items-start overflow-x-auto relative shrink-0 w-full max-w-[1040px]"
              data-node-id="178359:18148"
            >
              <div className="min-w-[680px] w-full flex flex-col">
                {/* Header Row (178359:18149) */}
                <div
                  className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border-[#e8e8e8] dark:border-[#1a1a1a] border-b border-solid flex items-start relative shrink-0 w-full"
                  data-node-id="178359:18149"
                >
                  <div
                    className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative"
                    data-node-id="178359:18150"
                  >
                    <span
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[21px] tracking-[-0.48px] whitespace-nowrap"
                      data-node-id="178359:18151"
                    >
                      Feature / Capability
                    </span>
                  </div>
                  <div
                    className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative"
                    data-node-id="178359:18152"
                  >
                    <span
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[21px] tracking-[-0.48px] whitespace-nowrap"
                      data-node-id="178359:18153"
                    >
                      Free Tier
                    </span>
                  </div>
                  <div
                    className="flex gap-[24px] items-center pb-[17px] pt-[16px] px-[16px] relative shrink-0 w-[388px]"
                    data-node-id="178359:18154"
                  >
                    <span
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[21px] tracking-[-0.48px] whitespace-nowrap"
                      data-node-id="178359:18155"
                    >
                      Monologg Pro
                    </span>
                    <div
                      className="flex gap-[10px] items-center justify-center relative shrink-0"
                      data-node-id="178359:18156"
                    >
                      <span
                        className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid rounded-full shrink-0 size-[8px]"
                        data-node-id="178359:18157"
                      />
                      <span
                        className="font-['Geist_Mono',monospace] font-normal text-[#f13030] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                        data-node-id="178359:18158"
                      >
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>

                {/* 23 Client Table Rows & Category Subheaders with Blur-in Entrance */}
                {clientRows.map((item, idx) => {
                  if ("isHeader" in item && item.isHeader) {
                    return (
                      <motion.div
                        key={item.nodeId}
                        initial={{ opacity: 0, filter: "blur(4px)", y: 6 }}
                        whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{
                          duration: 0.3,
                          delay: Math.min(idx * 0.02, 0.3),
                          ease: [0.4, 0, 0.2, 1],
                        }}
                        className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border-[#e8e8e8] dark:border-[#1a1a1a] border-solid border-t flex items-center pt-px relative shrink-0 w-full h-[55px]"
                        data-node-id={item.nodeId}
                      >
                        <div className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative">
                          <span
                            className={`font-['Switzer',sans-serif] ${
                              item.weight === "medium" ? "font-medium" : "font-semibold"
                            } text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] leading-[18px] whitespace-nowrap`}
                          >
                            {item.title}
                          </span>
                        </div>
                        <div className="flex flex-[1_0_0] flex-col h-[53px] items-start min-w-px p-[16px] relative" />
                        <div className="flex flex-col h-[49px] items-start pb-[17px] pt-[16px] px-[16px] relative shrink-0 w-[388px]" />
                      </motion.div>
                    );
                  }

                  const row = item as {
                    nodeId: string;
                    feature: string;
                    freeTier: string;
                    proTier: string;
                  };

                  return (
                    <motion.div
                      key={row.nodeId}
                      initial={{ opacity: 0, filter: "blur(6px)", y: 10 }}
                      whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                      viewport={{ once: true, amount: 0.1 }}
                      transition={{
                        duration: 0.35,
                        delay: Math.min(idx * 0.025, 0.35),
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      className="border-[#e8e8e8] dark:border-[#1a1a1a] border-solid border-t flex items-center pt-px relative shrink-0 w-full hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors duration-150 cursor-pointer"
                      data-node-id={row.nodeId}
                    >
                      <div className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative">
                        <span className="font-['Inter_Tight',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] leading-[17px] tracking-[0.42px] whitespace-nowrap">
                          {row.feature}
                        </span>
                      </div>
                      <div className="flex flex-[1_0_0] flex-col items-start min-w-px p-[16px] relative">
                        <span className="font-['Inter_Tight',sans-serif] font-normal text-[#484848] dark:text-[#bababa] text-[14px] leading-[20.93px] tracking-[0.42px] whitespace-nowrap">
                          {row.freeTier}
                        </span>
                      </div>
                      <div className="flex flex-col items-start pb-[17px] pt-[16px] px-[16px] relative shrink-0 w-[388px]">
                        <span className="font-['Inter_Tight',sans-serif] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12.5px] leading-[15px] tracking-[0.375px] whitespace-nowrap">
                          {row.proTier}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* CTA Button Under Clients Table (178401:153027) */}
            <div className="flex items-center relative shrink-0" data-node-id="178401:153027">
              <button
                onClick={() => navigate(loggedInUser ? "/client" : "/auth?mode=signup&role=client")}
                className="bg-[#f13030] hover:bg-[#d31f20] text-white flex gap-[8px] h-[40px] items-center justify-center px-[24px] py-[8px] rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] transition-all active:scale-95 cursor-pointer"
                data-node-id="178401:153028"
              >
                <span
                  className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] leading-[16px] tracking-[-0.12px] text-white whitespace-nowrap"
                  data-node-id="178401:153030"
                >
                  Get started for free
                </span>
                <div className="relative shrink-0 size-[16px]" data-node-id="178401:153031">
                  <img
                    alt=""
                    className="absolute block inset-0 max-w-none size-full"
                    src={ASSETS.arrowRight}
                  />
                </div>
              </button>
            </div>
          </section>
        )}

        {/* ── Dashed Horizontal Divider (178359:18317) ── */}
        <div
          className="h-0 relative w-full max-w-[1440px]"
          data-node-id="178359:18317"
        >
          <div className="absolute inset-[-1px_-2.5%]">
            <img
              alt=""
              className="block max-w-none size-full dark:invert"
              src={ASSETS.dashedDivider}
            />
          </div>
        </div>

        {/* ── 6. Frequently Asked Questions Section (178359:18323) ── */}
        <section
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center justify-center overflow-clip px-4 sm:px-8 lg:px-[200px] py-16 lg:py-[120px] relative shrink-0 w-full"
          data-node-id="178359:18323"
        >
          <div
            className="flex flex-col gap-[24px] items-center relative shrink-0"
            data-node-id="I178359:18323;178150:28415"
          >
            <h2
              className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[36px] sm:text-[48px] leading-[48px] tracking-[-1.44px] text-center"
              data-node-id="I178359:18323;178150:28416"
            >
              Frequently Asked Questions
            </h2>
            <div
              className="font-['Inter_Tight',sans-serif] font-normal text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] text-center tracking-[0.48px] max-w-[372px]"
              data-node-id="I178359:18323;178150:28492"
            >
              <p className="mb-0">Got questions about how payments, escrow, </p>
              <p>or Thespian AI work? Here are the answers.</p>
            </div>
          </div>

          <div
            className="flex flex-col gap-[12px] items-center relative shrink-0 w-full max-w-[910px]"
            data-node-id="I178359:18323;178150:28418"
          >
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#000000] border border-transparent dark:border-[#1a1a1a] flex flex-col py-[24px] px-[8px] relative rounded-[12px] shrink-0 w-full hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors duration-150"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex gap-[24px] items-start justify-between text-left cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex-[1_0_0] min-w-px flex flex-col gap-[12px] items-start">
                      <span className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]">
                        {faq.question}
                      </span>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="answer"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
                              opacity: { duration: 0.2, ease: "linear" },
                            }}
                            className="overflow-hidden w-full"
                          >
                            <p className="font-['Inter_Tight',sans-serif] font-normal text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] tracking-[0.48px] pt-1">
                              {faq.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center justify-center relative shrink-0 p-1">
                      <motion.div
                        animate={{ rotate: isOpen ? 45 : 0 }}
                        transition={{ type: "spring", stiffness: 360, damping: 25 }}
                        className="flex-none"
                      >
                        <div className="relative size-[24px]">
                          <img
                            alt=""
                            className="absolute block inset-0 max-w-none size-full dark:invert"
                            src={ASSETS.faqPlus}
                          />
                        </div>
                      </motion.div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 7. WebsiteFooter (178359:18324) ── */}
        <WebsiteFooter />
      </main>
    </div>
  );
}
