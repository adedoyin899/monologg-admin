import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";
import {
  ChevronDown,
  LayoutDashboard,
  User,
  Search,
  Briefcase,
  Settings,
  LogOut,
} from "lucide-react";
import { appStateSync } from "../../lib/state-sync";
import { apiClient } from "../../lib/api-client";
import { useTheme } from "../Root";
import { WebsiteFooter } from "../components/WebsiteFooter";
import { PerformerAvatarRow } from "../components/PerformerAvatarRow";
import { TopAnnouncementBar } from "../components/TopAnnouncementBar";
import {
  BespokeMobileNavDrawer,
  MobileMenuButton,
} from "../components/BespokeMobileNav";

// ─── Local Figma Assets (Node 178359:16886) ───────────────────────────────────
// Header Logo
const imgHeaderLogoMask = "/assets/home/421a9122738c7030bca32dfdc9e66e861b17a1e0.svg";
const imgHeaderLogoGroup = "/assets/home/42406d6b92ad6d49dc99bf1748474b2457bf8974.svg";
const imgHeaderLogoVector = "/assets/home/b715a74e897fed863a52c5d7246006146e5893aa.svg";
const imgThemeToggleSvg = "/assets/pricing/theme-toggle.svg";

// Hero Avatar fallback
const imgAvatar1 = "/assets/home/6012d1b610f186b4da032a28a55bf16e19555e2e.png";
const imgIconArrowRight = "/assets/home/516903b6b524bafd57d55118edffff86c955eb80.svg";

// Hero iPhone 15 Mockup
const imgPhoneScreen = "/assets/home/aea552544bf22223a0a369404407ee0f5488aa63.png";
const imgPhoneCameraRect = "/assets/home/97f0563d2e331b9a8b1adcb02bd9e81265f202a7.png";
const imgPhoneShadow = "/assets/home/779e9d90b0fa2a2b44202822c9c8ecc9f5d6dcba.svg";
const imgPhoneFlattened = "/assets/home/5d9bb5487ee8ad5bd3e2f8f244725266a1d538b4.svg";
const imgPhoneIslandBg = "/assets/home/4b1f792b435a29764e06163b85027ec49b4b7caa.svg";
const imgPhoneCamVec0 = "/assets/home/2d791cc3745a0c4bf2522f23a575c2b4df552186.svg";
const imgPhoneCamVec1 = "/assets/home/3742fd5b0c751f9a616be929f814b72daf6102d7.svg";
const imgPhoneCamVec2 = "/assets/home/10750c77182201a71d00f6610002acf93805fbf3.svg";
const imgPhoneCamVec3 = "/assets/home/f0877ac2b1f91c46925172afa141426670279eaf.svg";
const imgPhoneCamVec4 = "/assets/home/12af2368f14747c294cb4a23f2a26a519c7db655.svg";

// Category Icons ("YOU BELONG HERE")
const imgMaskHappy = "/assets/home/c6c4d106f03e8d3347d2e9672c15ae67d306ca07.svg";
const imgVoiceprintLine = "/assets/home/b0f2b64703ba1b9828581ef78672100bf5529560.svg";
const imgMicrophoneStage = "/assets/home/cebcfcc67d286b57f5a22fafd87325bf7c63b4ae.svg";
const imgEmotionLaughLine = "/assets/home/10eb628c60e7c7409d571009e3bf0ed496ab4438.svg";
const imgHeadphoneLine = "/assets/home/a0db53019c5ba3fd580a87befd55273243f50ab4.svg";
const imgVidicon2Line = "/assets/home/ae3066e194c8d363435044ef41e39cf44a9073c2.svg";

// Hero Category List for Infinite Horizontal Marquee
const HERO_CATEGORIES = [
  { name: "Actors", icon: imgMaskHappy },
  { name: "Speakers", icon: imgVoiceprintLine },
  { name: "Comperes", icon: imgMicrophoneStage },
  { name: "Comedians", icon: imgEmotionLaughLine },
  { name: "Artists", icon: imgHeadphoneLine },
  { name: "Creators", icon: imgVidicon2Line },
];

// Dashed Divider
const imgDashedDivider = "/assets/home/7dc94ccc0ee6370325d0ef6f15631b8f8b00d4c2.svg";

// 6 Feature Illustrations (300x300 SVG layers) — Figma 178423:1897 (Dark Mode 1:1)
const imgFeatureMask = "/assets/home/2edd4450f001dd0abfe2d83e8c81067819f49f0c.svg";

// Feature 1: Share Your Stage Anywhere (178426:5842)
const imgF1Group1Light = "/assets/home/98c64635325d633809bbf32e3520dd185346a0a2.svg";
const imgF1Group1Dark = "/assets/home/435373bebd8b4d28f7e5defdcbe29edd726485e7.svg";
const imgF1Group2Light = "/assets/home/a9053c3b6a7c8645c784864ba4bdbcbd7e41146d.svg";
const imgF1Group2Dark = "/assets/home/9cdc20923e48d0f963c9d12aa695183d3ccc6ab2.svg";
const imgF1Group3Light = "/assets/home/0fbf59f68982def288fbceff2af2d4af40484195.svg";
const imgF1Group3Dark = "/assets/home/a1656a05809097a7b5e15c89a651fb0057a43dbb.svg";

// Feature 2: Monetize Fan Shoutouts & Micro-Deliverables (178426:5873)
const imgF2Group1Light = "/assets/home/4cde797795be8839268ab92bcee66414e1927c50.svg";
const imgF2Group1Dark = "/assets/home/44ce946b8752e975ef1830d705915592b6b2a90f.svg";
const imgF2Group2Light = "/assets/home/a3dad4f0efe914102ec45a559ac2337b7da4c3a8.svg";
const imgF2Group2Dark = "/assets/home/92ca72d29bc8d1731f2bfc5c2899eee2ba1095dd.svg";
const imgF2Group3Light = "/assets/home/4e58aac253470830ffdbd41393d77f2d2e9f6872.svg";
const imgF2Group3Dark = "/assets/home/0019a7144dee071d681dd4842484978de8705105.svg";
const imgF2Vec0Light = "/assets/home/a4b28ddcb786fceb51cb243a3154166b126ae1f9.svg";
const imgF2Vec0Dark = "/assets/home/3700ee89c75583b67056a2d6726378715f9e9c0e.svg";
const imgF2Vec1Light = "/assets/home/bf4acc62a8406605166db2a5fdd327d2ddfde68e.svg";
const imgF2Vec1Dark = "/assets/home/9df972a017497a59e20a7e36df99ddbf0e5944af.svg";
const imgF2Vec2Light = "/assets/home/d07bfbf69f955b262d8858aaf25f114fc10472e8.svg";
const imgF2Vec2Dark = "/assets/home/d3c4d5aae329a39d2eb55e68a041cfba9ab6226b.svg";
const imgF2Group4Light = "/assets/home/f60b778be7c231b2761c48018283197971fbe033.svg";
const imgF2Group4Dark = "/assets/home/104abc9bd256f601591f2363b0711ecd19a7efbf.svg";
const imgF2Vec3Light = "/assets/home/37e87353ce236c0bb4114e3f8cac823e3972cb11.svg";
const imgF2Vec3Dark = "/assets/home/a15cb7a27713ff43149aef2bf2bd54b9438d3e42.svg";
const imgF2Vec4Light = "/assets/home/e2c3e00b34eff13a382034e38e29d30c5775ca77.svg";
const imgF2Vec4Dark = "/assets/home/850b084ab7f2edb94ec20827c1ff9807a3ad0ee7.svg";
const imgF2Vec5Light = "/assets/home/b96bf97cabc321fbd4f51b33bc23c9131d674ebb.svg";
const imgF2Vec5Dark = "/assets/home/578231a4510f1e36179ee298d14b6b6531d4cf16.svg";

// Feature 3: Analyze your audience (178426:5925)
const imgF3Group1Light = "/assets/home/aabd3410e99057ad407e78740304a4f3cdadbc00.svg";
const imgF3Group1Dark = "/assets/home/b618cf6bf136216af355c1b5d8b3a3a8a74ba213.svg";
const imgF3Group2Light = "/assets/home/c3c2205b54801ffb4ffa3c0c8f64f222d9d5ba82.svg";
const imgF3Group2Dark = "/assets/home/0b3493abfa666c3534f163be4463a7a850536d6d.svg";
const imgF3Group3Light = "/assets/home/c70aefb04d18ce1b677c58a78a8d2ef7e1ef7db8.svg";
const imgF3Group3Dark = "/assets/home/cd9713dd79db0ef88c5433990d3e584a7ec60488.svg";
const imgF3Vec0Light = "/assets/home/a4b28ddcb786fceb51cb243a3154166b126ae1f9.svg";
const imgF3Vec0Dark = "/assets/home/3700ee89c75583b67056a2d6726378715f9e9c0e.svg";
const imgF3Vec1Light = "/assets/home/32f92c4698b8c383573be044895f8466a1c77692.svg";
const imgF3Vec1Dark = "/assets/home/a09bf2d1716c7635ece70d26856a303b9d9f1afe.svg";

// Feature 4: Set Transparent Custom Rate Cards (178426:5955)
const imgF4Group1Light = "/assets/home/00b366f479866e949af6feaff050039cae39e2ea.svg";
const imgF4Group1Dark = "/assets/home/d52147b5ec3bc89043cd85c9d37a5427ec37250f.svg";
const imgF4Group2Light = "/assets/home/b9864c3dc11d0ba0cad4ace419563215a419fc45.svg";
const imgF4Group2Dark = "/assets/home/838aa0ba917ae77edf170276c04c15503e49d248.svg";
const imgF4Vec0Light = "/assets/home/0a04a380b17057fc6d6b09f2b87617ec3813a9f3.svg";
const imgF4Vec0Dark = "/assets/home/5e214c4a3c824e68c67084c4d629da70410f0775.svg";
const imgF4Group3Light = "/assets/home/39f84d643c4af41b48d16c130cfdbe39fff7bf50.svg";
const imgF4Group3Dark = "/assets/home/95bc63e9bbdea78d2c2c0fdd8b6b04faee500837.svg";
const imgF4Vec1Light = "/assets/home/a4b28ddcb786fceb51cb243a3154166b126ae1f9.svg";
const imgF4Vec1Dark = "/assets/home/3700ee89c75583b67056a2d6726378715f9e9c0e.svg";
const imgF4Vec2Light = "/assets/home/0c81cf78681d1bb7e2aab16b506878d4d7a434f0.svg";
const imgF4Vec2Dark = "/assets/home/dde9ad34a197613af6c6072694b5e6d86ac87929.svg";

// Feature 5: Powered by Thespian AI (178426:6015)
const imgF5Group1Light = "/assets/home/093466eddeb77ae923a9677fed663bf902e7e90d.svg";
const imgF5Group1Dark = "/assets/home/eb0b590431766f501d2ebdc489aecbe70e5ffeb7.svg";
const imgF5Group2Light = "/assets/home/7bbbb0d18b1f2164efadb0be13ebd4066611fa41.svg";
const imgF5Group2Dark = "/assets/home/4aa2dcae2d58c7c0efe0a42ec47d7a2039f75dc2.svg";
const imgF5Group3Light = "/assets/home/abcf2a2e0701df1fb1097d399102aa1d56d407e4.svg";
const imgF5Group3Dark = "/assets/home/c543cfb6ab83446dbc233638453e471745f87447.svg";
const imgF5Vec0Light = "/assets/home/46d1d3714f7474baa93edb08f354d6bb5aeb592f.svg";
const imgF5Vec0Dark = "/assets/home/34b9ebe1dcec322b4a14a8d09143393d31f2974b.svg";
const imgF5Group4Light = "/assets/home/a5c59ee257058ae45f587efb79143598c341379e.svg";
const imgF5Group4Dark = "/assets/home/6f07f83f3ed915c5235aa3e6d5eb016b528ef59d.svg";

// Feature 6: Bank-Grade Escrow Protection (178426:5987)
const imgF6Group1Light = "/assets/home/99dc4838d391d9acdf260f55289a251fc7534b45.svg";
const imgF6Group1Dark = "/assets/home/e9c1149afe8c74a342342c4f8f4dddc815381a10.svg";
const imgF6Group2Light = "/assets/home/7bbbb0d18b1f2164efadb0be13ebd4066611fa41.svg";
const imgF6Group2Dark = "/assets/home/4aa2dcae2d58c7c0efe0a42ec47d7a2039f75dc2.svg";
const imgF6Group3Light = "/assets/home/dfd3c8df98687c6983ad56cb39fc623456f33b0c.svg";
const imgF6Group3Dark = "/assets/home/0af70b0eab9e48de0f17cbe51f2fc12cfa52d1d0.svg";
const imgF6Vec0Dark = "/assets/home/34b9ebe1dcec322b4a14a8d09143393d31f2974b.svg";

// FAQ Icons
const imgPlus = "/assets/home/0f468a50f646f4cf0717649c47ca00c3757b7265.svg";

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What is Monologg and how does it work?",
    a: "Monologg is like Upwork for Actors, Public speakers, Comperes, Comedians, Streamers, Artists, Musicians, and Creators. Performers get a personalized link to showcase their work, set prices, and manage bookings. Clients such as studios, directors, and event organizers use it to find verified talent, post jobs, and pay securely through the platform.",
  },
  {
    q: "What currency does Monologg support?",
    a: "Currently, all transactions are processed in Nigerian Naira (₦) through secure payment gateways such as Paystack. Future updates will include support for Dollar (USD) and Pound (GBP) payments.",
  },
  {
    q: "How does escrow payment protection work?",
    a: "To ensure safety for all parties, clients deposit the agreed payment into an escrow account managed by Monologg before the performance begins. Once the job is completed and both parties provide feedback, the funds are released to the performer immediately.",
  },
  {
    q: "What are the platform fees?",
    a: "Monologg charges a total fee of 16% for each booking, divided between performers and clients: 7% deducted from performer earnings, which is less than the typical 20% to 25% taken by traditional agents; clients bear an additional 9% on their invoices to ensure payment protection.",
  },
  {
    q: "How does Thespian AI work?",
    a: "When performers upload their monologues or voice reels, Thespian AI analyzes the audio to identify key elements like accent, emotional tone, comedic timing, and performance style, automatically tagging the profile with relevant descriptors.",
  },
  {
    q: "What data can performers see?",
    a: "Performers are provided with a user-friendly dashboard that tracks metrics such as profile views, video plays, traffic sources (e.g., Instagram, TikTok), and revenue generated from various packages.",
  },
  {
    q: "How does Monologg ensure safety for payments?",
    a: "Monologg uses an escrow system to secure payments. Funds are held safely until the performer completes the job or delivers the shoutout, ensuring that clients only pay for work they approve.",
  },
  {
    q: "What features does Monologg offer to performers?",
    a: "Performers can create personalized profiles, upload portfolios, set their own rates, and manage bookings seamlessly. They can also receive feedback from clients and showcase their experience, increasing their visibility and opportunities.",
  },
  {
    q: "How does Monologg support communication between clients and performers?",
    a: "Monologg features an integrated messaging system that allows clients and performers to communicate directly, discuss project details, and finalize arrangements efficiently.",
  },
  {
    q: "What type of gigs can clients post on Monologg?",
    a: "Clients can post a variety of gigs ranging from acting roles, public speaking events, and comedy performances to music gigs and custom video requests, catering to diverse entertainment needs.",
  },
];

function DualImg({
  lightSrc,
  darkSrc,
  alt = "",
  className = "",
}: {
  lightSrc: string;
  darkSrc: string;
  alt?: string;
  className?: string;
}) {
  return (
    <>
      <img alt={alt} className={`block dark:hidden max-w-none size-full ${className}`} src={lightSrc} />
      <img alt={alt} className={`hidden dark:block max-w-none size-full ${className}`} src={darkSrc} />
    </>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { toggle } = useTheme();
  const [openFaqIndices, setOpenFaqIndices] = useState<number[]>([0]);

  // ── Timeline Scroll Progress (Figma 178359:16989) ─────────────────────────
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 80%", "end 55%"],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // ── Typewriter Animation for Hero Headline (Find Performers ⟷ Find Gigs) ───
  const TYPEWRITER_PHRASES = ["Find Performers", "Find Gigs"];
  const [typewriterIndex, setTypewriterIndex] = useState(0);
  const [typewriterText, setTypewriterText] = useState(TYPEWRITER_PHRASES[0]);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = TYPEWRITER_PHRASES[typewriterIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (isDeleting) {
      if (typewriterText.length > 0) {
        timeout = setTimeout(() => {
          setTypewriterText(currentPhrase.slice(0, typewriterText.length - 1));
        }, 45);
      } else {
        setIsDeleting(false);
        setTypewriterIndex((prev) => (prev + 1) % TYPEWRITER_PHRASES.length);
      }
    } else {
      if (typewriterText.length < currentPhrase.length) {
        timeout = setTimeout(() => {
          setTypewriterText(currentPhrase.slice(0, typewriterText.length + 1));
        }, 90);
      } else {
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, 2200);
      }
    }

    return () => clearTimeout(timeout);
  }, [typewriterText, isDeleting, typewriterIndex]);

  // ── Signed-in awareness (preserved for LandingPageHeader.test.tsx) ──────
  const [loggedInUser, setLoggedInUser] = useState(() =>
    appStateSync.getLoggedInUser(),
  );
  const [talentProfile, setTalentProfile] = useState(() => appStateSync.getTalentProfile());
  const [clientProfile, setClientProfile] = useState(() => appStateSync.getClientProfile());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      setLoggedInUser(appStateSync.getLoggedInUser());
      setTalentProfile(appStateSync.getTalentProfile());
      setClientProfile(appStateSync.getClientProfile());
    };
    const unsub = appStateSync.subscribe(sync);
    window.addEventListener("monologg_sync_update", sync);
    return () => {
      unsub();
      window.removeEventListener("monologg_sync_update", sync);
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [userMenuOpen]);

  const isClientSession = loggedInUser?.userType === "CLIENT";
  const displayName = loggedInUser
    ? isClientSession
      ? clientProfile.name || loggedInUser.name
      : talentProfile.name || loggedInUser.name
    : "";
  const displayAvatar = loggedInUser
    ? (isClientSession ? clientProfile.avatarUrl : talentProfile.avatarUrl) || imgAvatar1
    : "";
  const dashboardHref = isClientSession ? "/client" : "/dashboard";
  const settingsHref = isClientSession ? "/client?tab=settings" : "/dashboard?tab=settings";

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await apiClient.logout();
    navigate("/");
  };

  const handleGetStarted = () => {
    if (loggedInUser) {
      navigate(isClientSession ? "/client" : "/dashboard");
      return;
    }
    navigate("/auth?mode=signup");
  };

  const toggleFaq = (idx: number) => {
    setOpenFaqIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  return (
    <div
      className="bg-white dark:bg-[#000000] text-[#1a1a1a] dark:text-[#f9f9f9] flex flex-col items-center relative w-full min-h-screen overflow-x-clip isolate"
      data-node-id="178359:16886"
      data-name="Home page"
    >
      {/* ─── 1. Top Announcement Bar (178359:16887) ─── */}
      <TopAnnouncementBar nodeId="178359:16887" />


      {/* ─── 3. Header (178359:16910) ─── */}
      <header
        className="backdrop-blur-[12px] bg-white/95 dark:bg-[#000000]/95 border-[#e8e8e8] dark:border-[#1a1a1a] border-b border-solid flex h-[68px] items-center justify-between px-4 sm:px-8 lg:px-[64px] shrink-0 sticky top-0 w-full z-50 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)]"
        data-node-id="178359:16910"
        data-name="Header"
      >
        <div
          className="flex gap-[12px] items-center relative shrink-0 lg:w-[710.055px]"
          data-node-id="I178359:16910;178032:14145"
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="h-[24px] overflow-clip relative shrink-0 w-[105.109px] cursor-pointer text-left"
            data-node-id="I178359:16910;177955:45008"
            data-name="Img - Monologg"
            aria-label="Monologg home"
          >
            <div
              className="absolute contents inset-[14.02%_80.78%_14.25%_3.55%]"
              data-node-id="I178359:16910;177955:45009"
              data-name="Clip path group"
            >
              <div
                className="absolute inset-[14.93%_81%_15.21%_3.77%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.227px_-0.219px] mask-size-[16.466px_17.215px]"
                data-node-id="I178359:16910;177955:45012"
                style={{
                  maskImage: `url("${imgHeaderLogoMask}")`,
                  WebkitMaskImage: `url("${imgHeaderLogoMask}")`,
                }}
                data-name="Group"
              >
                <div className="absolute inset-[-1.33%_-1.39%_-1.65%_-1.39%]">
                  <img alt="" className="block max-w-none size-full dark:invert" src={imgHeaderLogoGroup} />
                </div>
              </div>
            </div>
            <div
              className="absolute inset-[22.1%_1.22%_6.52%_24.14%]"
              data-node-id="I178359:16910;177955:45019"
              data-name="Vector"
            >
              <img alt="Monologg" className="absolute block inset-0 max-w-none size-full dark:invert" src={imgHeaderLogoVector} />
            </div>
          </button>

          <nav
            className="hidden md:flex gap-[4px] items-center relative shrink-0"
            data-node-id="I178359:16910;178032:14144"
          >
            <button
              type="button"
              onClick={() => navigate("/product")}
              className="cursor-pointer flex flex-col items-start px-[16px] py-[6px] relative rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[12px] leading-[16px] whitespace-nowrap"
              data-node-id="I178359:16910;177955:45021"
              data-name="Link"
            >
              Product
            </button>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              className="cursor-pointer flex flex-col items-start px-[16px] py-[6px] relative rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[12px] leading-[16px] whitespace-nowrap"
              data-node-id="I178359:16910;177955:45023"
              data-name="Link"
            >
              Pricing
            </button>
            <button
              type="button"
              onClick={() => navigate("/resources")}
              className="cursor-pointer flex flex-col items-start px-[16px] py-[6px] relative rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[12px] leading-[16px] whitespace-nowrap"
              data-node-id="I178359:16910;177955:45025"
              data-name="Link"
            >
              Resources
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex gap-[12px] items-center relative shrink-0">
          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle theme"
            className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex items-center justify-center relative rounded-full shrink-0 size-[36px] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0 size-[16px]">
              <img
                alt="Toggle theme"
                className="absolute block inset-0 max-w-none size-full dark:invert"
                src={imgThemeToggleSvg}
              />
            </div>
          </button>

          {loggedInUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                aria-label="Account menu"
                className="flex items-center gap-2 pl-1.5 pr-2.5 sm:pr-3 py-1 rounded-full border border-[#e8e8e8] dark:border-[#1a1a1a] hover:border-[#1a1a1a] dark:hover:border-[#f9f9f9] bg-white dark:bg-[#000000] transition-all cursor-pointer"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-[#f8f8f8] dark:bg-[#1a1a1a] shrink-0 border border-black/5 dark:border-white/10">
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <span className="hidden sm:inline font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[12px] text-[#1a1a1a] dark:text-[#f9f9f9] max-w-[140px] truncate">
                  {displayName}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#767676] dark:text-[#a3a3a3] transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userMenuOpen && (
                <div
                  data-testid="user-account-dropdown"
                  className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] rounded-2xl shadow-xl py-2 z-50"
                >
                  <div className="px-4 py-2.5 border-b border-[#e8e8e8] dark:border-[#1a1a1a]">
                    <p className="text-[13px] font-bold text-[#1a1a1a] dark:text-[#f9f9f9] truncate">{displayName}</p>
                    <p className="text-[11px] text-[#767676] dark:text-[#a3a3a3] truncate">{loggedInUser.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#FFF0F0] dark:bg-[#f13030]/20 text-[#f13030]">
                      {isClientSession ? "Client Workspace" : "Performer"}
                    </span>
                  </div>
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate(dashboardHref);
                      }}
                      className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                      Dashboard
                    </button>
                    {!isClientSession ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/emeka-johnson");
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                        >
                          <User className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          My Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/dashboard");
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                        >
                          <Search className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          Browse Gigs
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/client");
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                        >
                          <Search className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          Find Performers
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/brief");
                          }}
                          className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                        >
                          <Briefcase className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          Post a Brief
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate(settingsHref);
                      }}
                      className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                    >
                      <Settings className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-[#e8e8e8] dark:border-[#1a1a1a] pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-[13px] font-semibold text-[#f13030] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex items-center gap-2.5"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex gap-[12px] items-center relative shrink-0"
              data-node-id="I178359:16910;177955:45029"
              data-name="Container"
            >
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signin")}
                className="border border-[#d1d1d1] dark:border-[#1a1a1a] hover:border-[#1a1a1a] dark:hover:border-[#f9f9f9] transition-colors cursor-pointer border-solid flex h-[40px] items-center justify-center pb-[11.5px] pt-[10.5px] px-[20px] relative rounded-full shrink-0 hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a]"
                data-node-id="I178359:16910;177955:45033"
                data-name="Button"
              >
                <span
                  className="flex flex-col font-['Plus_Jakarta_Sans',sans-serif] font-bold justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[12px] leading-[16px] text-center tracking-[-0.12px] whitespace-nowrap"
                  data-node-id="I178359:16910;177955:45034"
                >
                  Sign In
                </span>
              </button>
              <button
                type="button"
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-[#f13030] hover:bg-[#d92626] text-white transition-colors cursor-pointer flex h-[40px] items-center justify-center pb-[12.5px] pt-[11.5px] px-[20px] relative rounded-full shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0"
                data-node-id="I178359:16910;177955:45035"
                data-name="Button"
              >
                <span
                  className="flex flex-col font-['Plus_Jakarta_Sans',sans-serif] font-bold justify-center relative shrink-0 text-[12px] leading-[16px] text-center text-white tracking-[-0.12px] whitespace-nowrap"
                  data-node-id="I178359:16910;177955:45037"
                >
                  Sign up free
                </span>
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
        activePage="home"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        loggedInUser={loggedInUser}
        displayName={displayName}
        displayAvatar={displayAvatar}
        isClientSession={isClientSession}
        onSignOut={handleSignOut}
      />

      {/* ─── 4. Hero Section (178359:16911) ─── */}
      <section
        className="flex flex-col items-center gap-16 sm:gap-24 lg:gap-[163px] px-4 sm:px-6 md:px-12 lg:px-[200px] py-12 sm:py-16 lg:py-[112px] relative w-full max-w-[1440px] z-10"
        data-node-id="178359:16911"
        data-name="testimonial"
      >
        {/* Top Hero Text & CTAs (178359:16919) */}
        <div
          className="flex flex-col gap-[32px] items-center justify-center relative w-full max-w-[1040px]"
          data-node-id="178359:16919"
        >
          <div
            className="flex flex-col gap-[20px] items-center relative shrink-0 w-full"
            data-node-id="178359:16920"
          >
            <div
              className="flex flex-col gap-[12px] items-center relative shrink-0"
              data-node-id="178359:16921"
            >
              {/* 5 Overlapping Performer Avatars with Caveat Hover Names & Focus Blur (Figma 178450:156007 & 178450:156023) */}
              <PerformerAvatarRow assetPrefix="home" data-node-id="178450:156007" />

              {/* Headline (178359:16934) with Typewriter Animation */}
              <h1
                className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[42px] sm:text-[56px] lg:text-[64px] leading-none text-center tracking-[-1.92px] sm:whitespace-nowrap"
                data-node-id="178359:16934"
              >
                <span className="leading-none mb-0 block min-h-[1.1em]" aria-label={`${typewriterText}, Finish Your Project.`}>
                  <span>{typewriterText}</span>
                  <span className="inline-block font-normal ml-0.5 select-none animate-pulse text-[#1a1a1a] dark:text-[#f9f9f9]" aria-hidden="true">|</span>
                </span>
                <span className="leading-none block">Finish Your Project.</span>
              </h1>
            </div>

            {/* Subtitle (178359:16935) */}
            <p
              className="font-['Inter_Tight',sans-serif] font-normal leading-[26px] not-italic relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[18px] text-center tracking-[0.54px] max-w-[664px]"
              data-node-id="178359:16935"
            >
              Discover the performing arts’ best-kept secrets. Connect directly with directors, studios, agencies, brand managers, and live event organizers.
            </p>
          </div>

          {/* CTA Buttons (178359:16936) */}
          <div className="flex gap-[8px] items-center relative shrink-0" data-node-id="178359:16936">
            <button
              type="button"
              onClick={() => navigate(loggedInUser ? "/client" : "/auth?mode=signup&role=client")}
              className="bg-[#f13030] hover:bg-[#d92626] text-white transition-colors cursor-pointer flex gap-[8px] h-[40px] items-center justify-center overflow-clip px-[24px] py-[8px] relative rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0"
              data-node-id="178359:16937"
              data-name="Button"
            >
              <span
                className="flex flex-col font-['Plus_Jakarta_Sans',sans-serif] font-semibold justify-center relative shrink-0 text-[14px] leading-[16px] text-center text-white tracking-[-0.12px] whitespace-nowrap"
                data-node-id="178359:16939"
              >
                Find Performers
              </span>
              <span className="relative shrink-0 size-[16px]" data-node-id="178359:16940" data-name="Icon / ArrowRight">
                <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconArrowRight} />
              </span>
            </button>

            <button
              type="button"
              onClick={() => navigate(loggedInUser ? "/dashboard" : "/auth?mode=signup&role=talent")}
              className="border border-[#d1d1d1] dark:border-[#1a1a1a] hover:border-[#1a1a1a] dark:hover:border-[#333333] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer border-solid flex h-[40px] items-center justify-center pb-[11.5px] pt-[10.5px] px-[20px] relative rounded-full shrink-0"
              data-node-id="178359:16942"
              data-name="Button"
            >
              <span
                className="flex flex-col font-['Plus_Jakarta_Sans',sans-serif] font-semibold justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] leading-[16px] text-center tracking-[-0.12px] whitespace-nowrap"
                data-node-id="178359:16943"
              >
                {` Find Gigs `}
              </span>
            </button>
          </div>
        </div>

        {/* iPhone 15 Mockup Stage + "YOU BELONG HERE" (178359:16944) */}
        <div
          className="flex flex-col gap-[40px] items-start relative w-full max-w-[1040px]"
          data-node-id="178359:16944"
        >
          {/* Grey Stage Box (178359:16945) */}
          <div
            className="hero-phone-stage bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] relative rounded-[24px] sm:rounded-[32px] shrink-0 w-full"
            data-node-id="178359:16945"
          >
            <div
              className="hero-phone-scaler"
              data-node-id="178359:16946"
            >
              <div className="absolute contents left-0 top-0" data-node-id="178359:16947">
                <div
                  className="absolute h-[23.038px] left-[12.93px] top-[781.6px] w-[361.642px]"
                  data-node-id="178359:16948"
                  data-name="shadow"
                >
                  <div className="absolute inset-[-62.66%_-3.99%]">
                    <img alt="" className="block max-w-none size-full" src={imgPhoneShadow} />
                  </div>
                </div>
                <div
                  className="absolute h-[801.124px] left-0 top-0 w-[385.324px]"
                  data-node-id="178359:16949"
                  data-name="iphone 15"
                >
                  <div
                    className="-translate-y-1/2 absolute bg-white h-[779.183px] left-[12.95px] overflow-clip rounded-[47.346px] top-1/2 w-[359.423px]"
                    data-node-id="178359:16950"
                    data-name="Screen"
                  >
                    <div
                      className="absolute h-[778.108px] left-[0.88px] top-[0.2px] w-[357.894px]"
                      data-node-id="178359:16953"
                      data-name="image"
                    >
                      <div aria-hidden className="absolute inset-0 pointer-events-none">
                        <div className="absolute bg-white inset-0" />
                        <div className="absolute inset-0 overflow-hidden">
                          <img
                            alt="Monologg Performer Dashboard"
                            className="absolute h-[101.71%] left-[-0.05%] max-w-none top-[1.89%] w-[99.97%]"
                            src={imgPhoneScreen}
                            loading="eager"
                            decoding="async"
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      className="absolute bg-white h-[31px] left-[245.05px] top-[25.03px] w-[25px]"
                      data-node-id="178361:20289"
                    />
                    <div
                      className="absolute bg-white h-[11px] left-[23.05px] top-[14.03px] w-[97px]"
                      data-node-id="178361:20290"
                    />
                  </div>
                  <div
                    className="absolute h-[801.124px] left-0 top-0 w-[385.324px]"
                    data-node-id="178359:16954"
                    data-name="Flattened"
                  >
                    <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneFlattened} />
                  </div>
                  <div
                    className="absolute h-[34.068px] left-[135.12px] top-[22.7px] w-[115.094px]"
                    data-node-id="178359:16955"
                  >
                    <div
                      className="absolute h-[34.068px] left-0 top-0 w-[115.094px]"
                      data-node-id="178359:16956"
                    >
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneIslandBg} />
                    </div>
                    <div
                      className="absolute contents inset-[28.64%_12.21%_28.71%_75.16%]"
                      data-node-id="178359:16957"
                      data-name="Group"
                    >
                      <div
                        className="absolute inset-[28.67%_12.23%_28.72%_75.16%]"
                        data-node-id="178359:16958"
                        data-name="Vector"
                      >
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneCamVec0} />
                      </div>
                      <div
                        className="absolute inset-[28.64%_12.21%_28.71%_75.17%]"
                        data-node-id="178359:16959"
                        data-name="Rectangle"
                      >
                        <div aria-hidden className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 overflow-hidden">
                            <img alt="" className="absolute left-0 max-w-none size-full top-0" src={imgPhoneCameraRect} />
                          </div>
                          <div className="absolute bg-[rgba(0,0,0,0.4)] inset-0" />
                        </div>
                      </div>
                      <div
                        className="absolute inset-[37.84%_14.93%_37.81%_77.86%]"
                        data-node-id="178359:16960"
                        data-name="Vector"
                      >
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneCamVec1} />
                      </div>
                      <div
                        className="absolute contents inset-[39.37%_15.38%_39.32%_78.32%]"
                        data-node-id="178359:16961"
                        data-name="Camera"
                      >
                        <div
                          className="absolute inset-[39.37%_15.38%_39.32%_78.32%]"
                          data-node-id="178359:16962"
                          data-name="Vector"
                        >
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneCamVec2} />
                        </div>
                        <div
                          className="absolute inset-[39.37%_15.38%_39.32%_78.32%] mix-blend-multiply"
                          data-node-id="178359:16963"
                          data-name="Vector"
                        >
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneCamVec3} />
                        </div>
                      </div>
                      <div
                        className="absolute inset-[51.76%_15.67%_40.63%_82.08%] mix-blend-screen"
                        data-node-id="178359:16964"
                        data-name="Vector"
                      >
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgPhoneCamVec4} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* "YOU BELONG HERE" + Left-to-Right Horizontal Scrolling Marquee (178359:16965) */}
          <div
            className="flex flex-col gap-[16px] items-center justify-center p-[12px] relative shrink-0 w-full overflow-hidden"
            data-node-id="178359:16965"
          >
            <div
              className="flex flex-col font-['Geist_Mono',monospace] font-normal justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
              data-node-id="178359:16966"
            >
              <p className="leading-[normal]">YOU BELONG HERE</p>
            </div>

            {/* Continuous Left-to-Right Scrolling Track with Edge Fades & Hover Pause */}
            <div
              className="relative w-full max-w-[1040px] overflow-hidden py-2"
              data-node-id="178359:16967"
            >
              {/* Left & Right Fade Gradients */}
              <div
                className="absolute bg-gradient-to-r from-white via-white/80 dark:from-[#000000] dark:via-[#000000]/80 to-transparent h-full left-0 top-0 w-[48px] sm:w-[96px] pointer-events-none z-10"
                data-node-id="178359:16986"
                data-name="Gradient"
              />
              <div
                className="absolute bg-gradient-to-l from-white via-white/80 dark:from-[#000000] dark:via-[#000000]/80 to-transparent h-full right-0 top-0 w-[48px] sm:w-[96px] pointer-events-none z-10"
                data-node-id="178359:16987"
                data-name="Gradient"
              />

              <div className="animate-marquee-ltr flex items-center gap-[32px] select-none">
                {[
                  ...HERO_CATEGORIES,
                  ...HERO_CATEGORIES,
                  ...HERO_CATEGORIES,
                  ...HERO_CATEGORIES,
                ].map((cat, idx) => (
                  <div
                    key={`${cat.name}-${idx}`}
                    className="flex gap-[8px] items-center justify-center relative shrink-0 px-4 py-2 rounded-full hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-all duration-200 cursor-pointer group hover:scale-105 active:scale-95"
                  >
                    <div className="relative shrink-0 size-[20px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full opacity-60 group-hover:opacity-100 transition-opacity"
                        src={cat.icon}
                      />
                    </div>
                    <p className="font-['Switzer',sans-serif] font-normal leading-[normal] not-italic text-[#767676] dark:text-[#a3a3a3] group-hover:text-[#1a1a1a] dark:group-hover:text-[#f9f9f9] transition-colors text-[20px] whitespace-nowrap">
                      {cat.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. Dashed Horizontal Divider (178359:16988) ─── */}
      <div className="h-0 relative w-full max-w-[1440px] z-10 dark:opacity-30 dark:invert" data-node-id="178359:16988">
        <div className="absolute inset-[-1px_-2.5%]">
          <img alt="" className="block max-w-none size-full" src={imgDashedDivider} />
        </div>
      </div>

      {/* ─── 6. Six-Feature Vertical Timeline Section (178359:16989) ─── */}
      <section
        id="features"
        className="flex flex-col items-center gap-16 lg:gap-[100px] px-6 md:px-16 lg:px-[300px] py-20 lg:py-[112px] relative w-full max-w-[1440px] z-10"
        data-node-id="178359:16989"
        data-name="testimonial"
      >
        {/* Section Header (178359:16990) */}
        <div
          className="flex flex-col gap-[20px] items-start justify-center not-italic relative w-full max-w-[766px]"
          data-node-id="178359:16990"
        >
          <div
            className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[36px] md:text-[48px] leading-[48px] tracking-[-1.44px] w-full max-w-[766px]"
            data-node-id="178359:16991"
            style={{ fontFeatureSettings: '"calt" 0, "liga" 0' }}
          >
            <p className="leading-[48px] whitespace-pre-wrap">{`Run your performing career like the business it actually is`}</p>
          </div>
          <p
            className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#f5f5f5] text-[16px] tracking-[0.48px] max-w-[650px]"
            data-node-id="178359:16992"
          >{`Share your work, set your prices, track your audience and get paid securely, without an agent in the middle.`}</p>
        </div>

        {/* Timeline Row: Left 2px Progress Line + Right 627px Feature Stack (178359:16993 / Figma 178423:1901) */}
        <div
          ref={timelineRef}
          className="flex flex-row gap-6 md:gap-[54px] items-stretch relative w-full max-w-[766px]"
          data-node-id="178359:16993"
        >
          {/* Left Vertical Line with Dynamic Scroll Progress Fill (178359:16994 / Figma 178423:1902) */}
          <div
            className="bg-[#e8e8e8] dark:bg-[#1a1a1a] relative w-[2px] shrink-0 rounded-[49px] overflow-hidden self-stretch"
            data-node-id="178359:16994"
          >
            <motion.div
              style={{ scaleY, transformOrigin: "top" }}
              className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#767676] to-[#d1d1d1] dark:from-[#484848] dark:to-[#aeaeae] rounded-[49px] w-[2px]"
              data-node-id="178359:16995"
            />
          </div>

          {/* Right Column: 6 Stacked Features (178359:16996) */}
          <div
            className="flex flex-col gap-20 lg:gap-[112px] items-start relative w-full max-w-[627px]"
            data-node-id="178359:16996"
          >
            {/* Feature 1: Share Your Stage Anywhere (178359:16997) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[40px] items-start relative w-full group"
              data-node-id="178359:16997"
            >
              <div
                className="flex flex-col gap-[24px] items-start not-italic relative shrink-0 w-full"
                data-node-id="178359:16998"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[28px] md:text-[32px] leading-[40px] tracking-[-0.96px]"
                  data-node-id="178359:16999"
                >
                  <p className="leading-[40px]">{`Share Your Stage Anywhere `}</p>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[620px]"
                  data-node-id="178359:17000"
                >
                  Join other performers using a single master link and instant QR code to share their portfolios, showreels, and press kits directly with casting directors, studios, agencies, brand managers, and live event organizers globally across all platforms.
                </p>
              </div>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] h-[352px] relative rounded-[17.034px] shrink-0 w-full overflow-hidden shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17001"
                data-name="Image"
              >
                <div
                  className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] overflow-clip size-[300px] top-[calc(50%+0.09px)]"
                  data-node-id="178359:17003"
                  data-name="Frame"
                >
                  <div className="absolute contents inset-0" data-node-id="178359:17004" data-name="Mask group">
                    <div
                      className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
                      data-node-id="178359:17007"
                      style={{
                        maskImage: `url("${imgFeatureMask}")`,
                        WebkitMaskImage: `url("${imgFeatureMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-0.16%_-0.22%]">
                        <DualImg lightSrc={imgF1Group1Light} darkSrc={imgF1Group1Dark} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-1/2 left-[40%] right-[40%] top-[30%]"
                    data-node-id="178359:17029"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-0.78%]">
                      <DualImg lightSrc={imgF1Group2Light} darkSrc={imgF1Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[35.94%_45.94%_55.94%_45.94%]"
                    data-node-id="178359:17031"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF1Group3Light} darkSrc={imgF1Group3Dark} className="absolute inset-0" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Feature 2: Monetize Fan Shoutouts & Micro-Deliverables (178359:17033) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[40px] items-start relative w-full group"
              data-node-id="178359:17033"
            >
              <div
                className="flex flex-col gap-[24px] items-start not-italic relative shrink-0 w-full"
                data-node-id="178359:17034"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[28px] md:text-[32px] leading-[40px] tracking-[-0.96px]"
                  data-node-id="178359:17035"
                >
                  <p className="leading-[40px]">{`Monetize Fan Shoutouts & Micro-Deliverables`}</p>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[620px]"
                  data-node-id="178359:17036"
                >
                  Earn up to 93% of your rate by selling custom video shoutouts, voice drops, and private consultations directly from your bio link—on your own prices and delivery timelines.
                </p>
              </div>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] h-[352px] relative rounded-[17.034px] shrink-0 w-full overflow-hidden shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17037"
                data-name="Image"
              >
                <div
                  className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] overflow-clip size-[300px] top-[calc(50%+0.09px)]"
                  data-node-id="178359:17038"
                  data-name="Frame"
                >
                  <div className="absolute contents inset-0" data-node-id="178359:17039" data-name="Mask group">
                    <div
                      className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
                      data-node-id="178359:17042"
                      style={{
                        maskImage: `url("${imgFeatureMask}")`,
                        WebkitMaskImage: `url("${imgFeatureMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-0.16%_-0.22%]">
                        <DualImg lightSrc={imgF2Group1Light} darkSrc={imgF2Group1Dark} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-[63.75%] left-[12.5%] right-[12.5%] top-1/4"
                    data-node-id="178359:17076"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-1.39%_-0.21%]">
                      <DualImg lightSrc={imgF2Group2Light} darkSrc={imgF2Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[27.83%_76.89%_66.58%_17.52%]"
                    data-node-id="178359:17078"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF2Group3Light} darkSrc={imgF2Group3Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[29.38%_56.25%_68.13%_27.5%]"
                    data-node-id="178359:17080"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec0Light} darkSrc={imgF2Vec0Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[27.5%_52.19%_66.25%_47.5%]"
                    data-node-id="178359:17081"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec1Light} darkSrc={imgF2Vec1Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[29.38%_36.25%_68.13%_51.25%]"
                    data-node-id="178359:17082"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec2Light} darkSrc={imgF2Vec2Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[27.5%_32.19%_66.25%_67.5%]"
                    data-node-id="178359:17083"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec1Light} darkSrc={imgF2Vec1Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[28.34%_23.65%_67.09%_71.78%]"
                    data-node-id="178359:17084"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF2Group4Light} darkSrc={imgF2Group4Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[27.66%_16.16%_70.91%_82.41%]"
                    data-node-id="178359:17086"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec3Light} darkSrc={imgF2Vec3Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[29.91%_16.16%_68.66%_82.41%]"
                    data-node-id="178359:17087"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec4Light} darkSrc={imgF2Vec4Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[32.16%_16.16%_66.41%_82.41%]"
                    data-node-id="178359:17088"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF2Vec5Light} darkSrc={imgF2Vec5Dark} className="absolute inset-0" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Feature 3: Analyze your audience (178359:17089) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[40px] items-start relative w-full group"
              data-node-id="178359:17089"
            >
              <div
                className="flex flex-col gap-[24px] items-start not-italic relative shrink-0 w-full"
                data-node-id="178359:17090"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[28px] md:text-[32px] leading-[40px] tracking-[-0.96px]"
                  data-node-id="178359:17091"
                >
                  <p className="leading-[40px]">Analyze your audience</p>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[620px]"
                  data-node-id="178359:17092"
                >
                  Track your profile visits, and link clicks in real time to see exactly where your fans are coming from and which packages make you the most money.
                </p>
              </div>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] h-[352px] relative rounded-[17.034px] shrink-0 w-full overflow-hidden shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17093"
                data-name="Image"
              >
                <div
                  className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] overflow-clip size-[300px] top-[calc(50%+0.09px)]"
                  data-node-id="178359:17095"
                  data-name="Frame"
                >
                  <div className="absolute contents inset-0" data-node-id="178359:17096" data-name="Mask group">
                    <div
                      className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
                      data-node-id="178359:17099"
                      style={{
                        maskImage: `url("${imgFeatureMask}")`,
                        WebkitMaskImage: `url("${imgFeatureMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-0.16%_-0.22%]">
                        <DualImg lightSrc={imgF3Group1Light} darkSrc={imgF3Group1Dark} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute inset-[16.25%_12.5%_68.75%_12.5%]"
                    data-node-id="178359:17118"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-1.04%_-0.21%]">
                      <DualImg lightSrc={imgF3Group2Light} darkSrc={imgF3Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[21.46%_74.9%_73.96%_20.53%]"
                    data-node-id="178359:17120"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF3Group3Light} darkSrc={imgF3Group3Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[20.31%_52.5%_77.19%_31.25%]"
                    data-node-id="178359:17122"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF3Vec0Light} darkSrc={imgF3Vec0Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[24.69%_36.25%_72.5%_31.25%]"
                    data-node-id="178359:17123"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF3Vec1Light} darkSrc={imgF3Vec1Dark} className="absolute inset-0" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Feature 4: Set Transparent Custom Rate Cards (178359:17124) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[40px] items-start relative w-full group"
              data-node-id="178359:17124"
            >
              <div
                className="flex flex-col gap-[24px] items-start not-italic relative shrink-0 w-full"
                data-node-id="178359:17125"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[28px] md:text-[32px] leading-[40px] tracking-[-0.96px]"
                  data-node-id="178359:17126"
                >
                  <p className="leading-[40px]">Set Transparent Custom Rate Cards</p>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[620px]"
                  data-node-id="178359:17127"
                >
                  Stop wasting time emailing back and forth—set clear, upfront Naira rates for auditions, hosting, voiceovers, or comedy sets so clients can book you instantly.
                </p>
              </div>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] h-[352px] relative rounded-[17.034px] shrink-0 w-full overflow-hidden shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17128"
                data-name="Image"
              >
                <div
                  className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] overflow-clip size-[300px] top-[calc(50%+0.09px)]"
                  data-node-id="178359:17130"
                  data-name="Frame"
                >
                  <div className="absolute contents inset-0" data-node-id="178359:17131" data-name="Mask group">
                    <div
                      className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
                      data-node-id="178359:17134"
                      style={{
                        maskImage: `url("${imgFeatureMask}")`,
                        WebkitMaskImage: `url("${imgFeatureMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-0.16%_-0.22%]">
                        <DualImg lightSrc={imgF4Group1Light} darkSrc={imgF4Group1Dark} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute bottom-1/2 left-[36.25%] right-[36.25%] top-[18.75%]"
                    data-node-id="178359:17154"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-0.5%_-0.57%]">
                      <DualImg lightSrc={imgF4Group2Light} darkSrc={imgF4Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[23.13%_44.38%_65.63%_44.38%]"
                    data-node-id="178359:17156"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF4Vec0Light} darkSrc={imgF4Vec0Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[25.94%_46.48%_67.73%_47.19%]"
                    data-node-id="178359:17157"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF4Group3Light} darkSrc={imgF4Group3Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[37.5%_41.87%_60%_41.88%]"
                    data-node-id="178359:17159"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF4Vec1Light} darkSrc={imgF4Vec1Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[42.5%_40%_55%_40%]"
                    data-node-id="178359:17160"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF4Vec2Light} darkSrc={imgF4Vec2Dark} className="absolute inset-0" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Feature 5: Powered by Thespian AI (178359:17161) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[40px] items-start relative w-full group"
              data-node-id="178359:17161"
            >
              <div
                className="flex flex-col gap-[24px] items-start not-italic relative shrink-0 w-full"
                data-node-id="178359:17162"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[28px] md:text-[32px] leading-[40px] tracking-[-0.96px]"
                  data-node-id="178359:17163"
                >
                  <p className="leading-[40px]">Powered by Thespian AI</p>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[620px]"
                  data-node-id="178359:17164"
                >
                  Get a 24/7 AI agent that automatically responds to questions on your behalf and books gigs onto your calendar while you sleep, and scans script PDFs to pitch your talent for open roles. Terms and Conditions apply.
                </p>
              </div>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] h-[352px] relative rounded-[17.034px] shrink-0 w-full overflow-hidden shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17165"
                data-name="Image"
              >
                <div
                  className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] overflow-clip size-[300px] top-[calc(50%+0.09px)]"
                  data-node-id="178359:17167"
                  data-name="Frame"
                >
                  <div className="absolute contents inset-0" data-node-id="178359:17168" data-name="Mask group">
                    <div
                      className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
                      data-node-id="178359:17171"
                      style={{
                        maskImage: `url("${imgFeatureMask}")`,
                        WebkitMaskImage: `url("${imgFeatureMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-0.16%_-0.22%]">
                        <DualImg lightSrc={imgF5Group1Light} darkSrc={imgF5Group1Dark} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute inset-[13.75%_47.5%_73.75%_12.5%]"
                    data-node-id="178359:17195"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-1.25%_-0.39%]">
                      <DualImg lightSrc={imgF5Group2Light} darkSrc={imgF5Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[17.21%_76.27%_77.21%_18.14%]"
                    data-node-id="178359:17197"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF5Group3Light} darkSrc={imgF5Group3Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[18.75%_53.75%_78.75%_27.5%]"
                    data-node-id="178359:17199"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF5Vec0Light} darkSrc={imgF5Vec0Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[58.75%_12.5%_28.75%_47.5%]"
                    data-node-id="178359:17200"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-1.25%_-0.39%]">
                      <DualImg lightSrc={imgF5Group2Light} darkSrc={imgF5Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[61.99%_41.48%_32.42%_53.36%]"
                    data-node-id="178359:17202"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF5Group4Light} darkSrc={imgF5Group4Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[63.75%_18.75%_33.75%_62.5%]"
                    data-node-id="178359:17204"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF5Vec0Light} darkSrc={imgF5Vec0Dark} className="absolute inset-0" />
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Feature 6: Bank-Grade Escrow Protection (178359:17205) */}
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-[40px] items-start relative w-full group"
              data-node-id="178359:17205"
            >
              <div
                className="flex flex-col gap-[24px] items-start not-italic relative shrink-0 w-full"
                data-node-id="178359:17206"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[28px] md:text-[32px] leading-[40px] tracking-[-0.96px]"
                  data-node-id="178359:17207"
                >
                  <p className="leading-[40px]">Bank-Grade Escrow Protection</p>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[620px]"
                  data-node-id="178359:17208"
                >
                  Never worry about late payments again—booking funds are safely held in escrow before you start working and sent straight to your bank account the moment you finish.
                </p>
              </div>
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] h-[352px] relative rounded-[17.034px] shrink-0 w-full overflow-hidden shadow-sm hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_36px_rgba(0,0,0,0.4)] transition-all duration-300 border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17209"
                data-name="Image"
              >
                <div
                  className="-translate-x-1/2 -translate-y-1/2 absolute left-[calc(50%-0.5px)] overflow-clip size-[300px] top-[calc(50%+0.09px)]"
                  data-node-id="178359:17211"
                  data-name="Frame"
                >
                  <div className="absolute contents inset-0" data-node-id="178359:17212" data-name="Mask group">
                    <div
                      className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
                      data-node-id="178359:17215"
                      style={{
                        maskImage: `url("${imgFeatureMask}")`,
                        WebkitMaskImage: `url("${imgFeatureMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-0.16%_-0.22%]">
                        <DualImg lightSrc={imgF6Group1Light} darkSrc={imgF6Group1Dark} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute inset-[13.75%_47.5%_73.75%_12.5%]"
                    data-node-id="178359:17233"
                    data-name="Group"
                  >
                    <div className="absolute inset-[-1.25%_-0.39%]">
                      <DualImg lightSrc={imgF6Group2Light} darkSrc={imgF6Group2Dark} />
                    </div>
                  </div>
                  <div
                    className="absolute inset-[17.21%_75.84%_77.64%_17.71%]"
                    data-node-id="178359:17235"
                    data-name="Group"
                  >
                    <DualImg lightSrc={imgF6Group3Light} darkSrc={imgF6Group3Dark} className="absolute inset-0" />
                  </div>
                  <div
                    className="absolute inset-[18.75%_53.75%_78.75%_27.5%]"
                    data-node-id="178359:17237"
                    data-name="Vector"
                  >
                    <DualImg lightSrc={imgF5Vec0Light} darkSrc={imgF6Vec0Dark} className="absolute inset-0" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── 7. FAQ Section (178359:17242 / 178151:50058) ─── */}
      <section
        id="faq"
        className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center justify-center overflow-clip px-6 md:px-12 lg:px-[200px] py-20 lg:py-[120px] relative w-full max-w-[1440px] z-10"
        data-node-id="178151:50058"
        data-name="FAQ"
      >
        <div
          className="flex flex-col gap-[24px] items-center not-italic relative shrink-0"
          data-node-id="178150:28415"
        >
          <div
            className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[36px] md:text-[48px] leading-[48px] tracking-[-1.44px] text-center"
            data-node-id="178150:28416"
            style={{
              fontFeatureSettings: '"zero" 1, "cv01" 1, "cv02" 1, "cv03" 1, "cv04" 1, "cv07" 1, "cv10" 1, "cv11" 1',
            }}
          >
            <p className="leading-[48px]">Frequently Asked Questions</p>
          </div>
          <div
            className="font-['Inter_Tight',sans-serif] font-normal relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] text-center tracking-[0.48px] max-w-[372px] whitespace-pre-wrap"
            data-node-id="178150:28492"
          >
            <p className="leading-[24px] mb-0">{`Got questions about how payments, escrow, `}</p>
            <p className="leading-[24px]">or Thespian AI work? Here are the answers.</p>
          </div>
        </div>

        <div
          className="flex flex-col gap-[12px] items-center relative shrink-0 w-full max-w-[910px]"
          data-node-id="178150:28418"
        >
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaqIndices.includes(idx);
            return (
              <div
                key={idx}
                className="bg-white dark:bg-[#000000] border border-transparent dark:border-[#1a1a1a] flex gap-[24px] items-start py-[24px] px-[8px] relative rounded-[12px] shrink-0 w-full cursor-pointer transition-colors duration-200 hover:bg-[#fafaf8] dark:hover:bg-[#1a1a1a]"
                onClick={() => toggleFaq(idx)}
              >
                <div className="flex-1 min-w-px relative">
                  <div className="flex flex-col gap-[12px] items-start not-italic relative size-full">
                    <div
                      className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px]"
                      style={{ fontFeatureSettings: '"zero" 1' }}
                    >
                      <p className="leading-[24px]">{item.q}</p>
                    </div>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="faq-content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{
                            height: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
                            opacity: { duration: 0.2, ease: "linear" },
                          }}
                          className="overflow-hidden w-full"
                        >
                          <p
                            className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[14px] tracking-[0.42px] w-full pt-1"
                            style={{
                              fontFeatureSettings:
                                '"zero" 1, "cv01" 1, "cv02" 1, "cv03" 1, "cv04" 1, "cv07" 1, "cv10" 1, "cv11" 1',
                            }}
                          >
                            {item.a}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={isOpen ? "Collapse answer" : "Expand answer"}
                  aria-expanded={isOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFaq(idx);
                  }}
                  className="flex items-center justify-center relative shrink-0 cursor-pointer p-1 rounded-full hover:bg-[#f0f0ed] dark:hover:bg-[#333333] transition-colors duration-150"
                >
                  <motion.div
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: "spring", stiffness: 360, damping: 25 }}
                    className="flex-none"
                  >
                    <div className="relative size-[24px]" data-name={isOpen ? "X" : "Plus"}>
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full dark:invert"
                        src={imgPlus}
                      />
                    </div>
                  </motion.div>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 8. Shared Website Footer (178359:17243) ─── */}
      <div className="w-full z-10">
        <WebsiteFooter onGetStarted={handleGetStarted} />
      </div>
    </div>
  );
}
export default LandingPage;
