import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
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
import {
  ChevronDown,
  LayoutDashboard,
  Settings as SettingsIcon,
  LogOut,
} from "lucide-react";

// ── Local Figma Assets from 178359:17305 (/assets/product/...) ──

// Header
const imgHeaderLogoMask = "/assets/product/421a9122738c7030bca32dfdc9e66e861b17a1e0.svg";
const imgHeaderLogoMark = "/assets/product/42406d6b92ad6d49dc99bf1748474b2457bf8974.svg";
const imgHeaderLogoWordmark = "/assets/product/b715a74e897fed863a52c5d7246006146e5893aa.svg";
const imgThemeToggleSvg = "/assets/product/c63a178a4b21cf2ea20dd9e61b037e06863d22b7.svg";

// Hero & CTA Buttons
const imgIconArrowRightWhite = "/assets/product/516903b6b524bafd57d55118edffff86c955eb80.svg";
const imgIconArrowRightRed = "/assets/product/10a8bb1ae813ccff638e74e1fb37b6b799179e49.svg";

// 7-Step Stepper Card State Icons (Active / Default / Completed) — Figma 178432:6988
const imgArrowCircleRightLight = "/assets/product/81db1c32dcabe58f2679bbc4723008ac3152faff.svg";
const imgArrowCircleRightDark = "/assets/product/54339bafbbcc9e6b77731ada85ecba530b967ea9.svg";
const imgSpinner = "/assets/product/d992e1c0bcf7201e7672eff69bed533992e67ce3.svg";
const imgCheckCircle = "/assets/product/5d95f1f313a1d448e7041b57c9347d098fcc237c.svg";

// 7-step showcase sliding-window constants
const STEP_COUNT = 7;
const STEP_VISIBLE_COUNT = 5;
const STEP_GAP = 12;
const STEP_EASE: [number, number, number, number] = [0.65, 0, 0.35, 1]; // smooth ease-in-out
const STEP_DURATION = 0.8;

// Shared 300x300 Phone Mask — Figma 178432:6988
const imgPhoneMask = "/assets/product/2edd4450f001dd0abfe2d83e8c81067819f49f0c.svg";

// Step 01: Sleek Bio Storefront (178432:7117)
const imgStep01Body = "/assets/product/b4fb21fc8ab4a6eca7be44a6f75285e33e8d6b47.svg";
const imgStep01Card = "/assets/product/838aa0ba917ae77edf170276c04c15503e49d248.svg";
const imgStep01IconBg = "/assets/product/efc23dabde6fe48f68306e35381d4a7506842dad.svg";
const imgStep01Avatar = "/assets/product/c2a5cc1c4f679c86495c950daa5b7eddb1ae478f.svg";
const imgStep01Line1 = "/assets/product/3700ee89c75583b67056a2d6726378715f9e9c0e.svg";
const imgStep01Line2 = "/assets/product/dde9ad34a197613af6c6072694b5e6d86ac87929.svg";

// Step 02: Custom Rate Cards & Micro-Deliverables (178432:7153)
const imgStep02Body = "/assets/product/634380a3f6c42c1b4ccac7601ddf2d70d0e8899e.svg";
const imgStep02Card = "/assets/product/4aa2dcae2d58c7c0efe0a42ec47d7a2039f75dc2.svg";
const imgStep02Icon = "/assets/product/0c178069942f355e55bcf7ad343cac135654b74b.svg";
const imgStep02Line = "/assets/product/34b9ebe1dcec322b4a14a8d09143393d31f2974b.svg";

// Step 03: Real-Time Performer Analytics & Visitor Intelligence (178432:7217)
const imgStep03Body = "/assets/product/fe97cdfe31ad66abbd267e4eff98ed71877533e0.svg";
const imgStep03Chart = "/assets/product/9cdc20923e48d0f963c9d12aa695183d3ccc6ab2.svg";
const imgStep03Graph = "/assets/product/bc3123d5b4e0ecd2d71f54e2ad2cf7e313c9c933.svg";

// Step 04: Escrow Security (178432:7252)
const imgStep04Body = "/assets/product/56fd3336dc2e13668ae9d6cacd2fa8be8b2409db.svg";
const imgStep04Badge = "/assets/product/e1be6be301cf6bffdc5ae71ef8e65865127d6720.svg";
const imgStep04Shield = "/assets/product/cc0e414779577b335f5ea9ec21a10e4d4c29fbf2.svg";

// Step 05: Direct Proposal Bidding (178432:7285)
const imgStep05Body = "/assets/product/65676811a2b05e17f7b1c0578cedd14fd76b60c2.svg";
const imgStep05Card = "/assets/product/3131b6a46248fbee83e46ea522a9bc37fe408659.svg";
const imgStep05Icon = "/assets/product/5d031a018c567c46e1f8d01a81a588caff9f7ce8.svg";
const imgStep05Pill1 = "/assets/product/dddf86949c278bd87da9fdeb363a8c83ddcb3ef3.svg";
const imgStep05Pill1Active = "/assets/product/66fef2995ce5b7ad111b4e002af09b6741cdf4c1.svg";
const imgStep05Pill2 = "/assets/product/89eea18ef7e7b35a4c1c35507c160c40709f4cfc.svg";
const imgStep05Pill2Active = "/assets/product/c8eb6b0cc8591363e7a94b6f1b5f8179874af23a.svg";
const imgStep05Pill3 = "/assets/product/ced3604fa8d14c91c03d190184f1cad889913c97.svg";

// Step 06: Integrated Scheduling (178432:7332)
const imgStep06Body = "/assets/product/c61e3481a74cff0baec11ea76b5e7cd608d24c7b.svg";
const imgStep06Card = "/assets/product/4aa2dcae2d58c7c0efe0a42ec47d7a2039f75dc2.svg";
const imgStep06Icon = "/assets/product/9ff33cfe4c5c2dd4c4293111052c987f6aa6b059.svg";
const imgStep06Line = "/assets/product/34b9ebe1dcec322b4a14a8d09143393d31f2974b.svg";

// Step 07: Interactive AI Agent (178432:7364)
const imgStep07Body = "/assets/product/41162da981cae90e8a0cad10c2dcbe71eb13e0b6.svg";
const imgStep07Bubble = "/assets/product/c163d4d4229c991ae1b70ad79983af240da55bd7.svg";
const imgStep07Circle = "/assets/product/a7d25ec37852b0dd451435eb2928a40f11fd7596.svg";
const imgStep07Icon = "/assets/product/66e6f200d56b4d1d458d012d98cc59fba48c7fd0.svg";
const imgStep07Line1 = "/assets/product/59ab7398d2c2daf9aaa836e20ad79ca5b8e9c5b5.svg";
const imgStep07Line2 = "/assets/product/2e11450fb902a5f7ec22186c4a202a0a0acbc94a.svg";
const imgStep07Check = "/assets/product/46008b74d529e797bb074ce9d88b9ec963d875a7.svg";

// Client Portal Icons & Dividers (178359:17765)
const imgSealCheck = "/assets/product/06e5d2fa6ae96a377a3e7d3af99609cbceb4ec2d.svg";
const imgClientVertDivider = "/assets/product/d5d92b724711f1d25ef4d3eceee5cbcb81e2ab3d.svg";
const imgChat4Fill = "/assets/product/6570ec056926e13f3904c8913939c4666fb548b9.svg";
const imgClientHorizDivider = "/assets/product/6e560c10559038fb8b15ddb80bdfaba942e1077b.svg";
const imgNotePencil = "/assets/product/36eaa778b44188f5263f7c2fe32385baf98dba66.svg";
const imgLockFill = "/assets/product/ec8e464fa6f32cff40f0a10d263eeab24e5df24b.svg";

// Section Dividers & Thespian AI Dividers (178359:17831)
const imgDashedDivider = "/assets/product/7dc94ccc0ee6370325d0ef6f15631b8f8b00d4c2.svg";
const imgThespianVert116 = "/assets/product/0ea607751a150fba84c44e04467701ab827a2a73.svg";
const imgThespianHoriz910 = "/assets/product/53e4874d36f89d43a8bff9fd94a731c57addaa21.svg";
const imgThespianVert60 = "/assets/product/e33eaa19c1e453995eaf9b69cc28a873ef337604.svg";
const imgThespianWideDivider = "/assets/product/11132c5419787d075ad3c0035763e5d22dfe5f91.svg";

// FAQ Icons (178359:17958)
const imgFaqPlus = "/assets/product/0f468a50f646f4cf0717649c47ca00c3757b7265.svg";

/**
 * Renders the exact 300x300 Figma SVG illustration for each of the 7 steps (0..6),
 * extracted directly from Figma 178432:6988 (Dark Mode 1:1 implementation).
 */
function StepIllustration({ stepIndex }: { stepIndex: number }) {
  switch (stepIndex) {
    // 01 — Sleek Bio Storefront (178432:7117)
    case 0:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7117"
          data-testid="step-illustration-01"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep01Body} />
              </div>
            </div>
          </div>
          <div className="absolute bottom-1/2 left-[36.25%] right-[36.25%] top-[18.75%]">
            <div className="absolute inset-[-0.5%_-0.57%]">
              <img alt="" className="block max-w-none size-full" src={imgStep01Card} />
            </div>
          </div>
          <div className="absolute inset-[23.13%_44.38%_65.63%_44.38%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep01IconBg} />
          </div>
          <div className="absolute inset-[25.94%_46.95%_68.44%_46.95%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep01Avatar} />
          </div>
          <div className="absolute inset-[37.5%_41.87%_60%_41.88%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep01Line1} />
          </div>
          <div className="absolute inset-[42.5%_40%_55%_40%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep01Line2} />
          </div>
        </div>
      );

    // 02 — Custom Rate Cards & Micro-Deliverables (178432:7153)
    case 1:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7153"
          data-testid="step-illustration-02"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep02Body} />
              </div>
            </div>
          </div>
          <div className="absolute inset-[13.75%_47.5%_73.75%_12.5%]">
            <div className="absolute inset-[-1.25%_-0.39%]">
              <img alt="" className="block max-w-none size-full" src={imgStep02Card} />
            </div>
          </div>
          <div className="absolute inset-[17.64%_76.27%_77.64%_18.14%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep02Icon} />
          </div>
          <div className="absolute inset-[18.75%_53.75%_78.75%_27.5%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep02Line} />
          </div>
        </div>
      );

    // 03 — Real-Time Performer Analytics & Visitor Intelligence (178432:7217)
    case 2:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7217"
          data-testid="step-illustration-03"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep03Body} />
              </div>
            </div>
          </div>
          <div className="absolute bottom-1/2 left-[40%] right-[40%] top-[30%]">
            <div className="absolute inset-[-0.78%]">
              <img alt="" className="block max-w-none size-full" src={imgStep03Chart} />
            </div>
          </div>
          <div className="absolute inset-[36.56%_45.94%_55.94%_45.94%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep03Graph} />
          </div>
        </div>
      );

    // 04 — Escrow Security (178432:7252)
    case 3:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7252"
          data-testid="step-illustration-04"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep04Body} />
              </div>
            </div>
          </div>
          <div className="absolute inset-[4.38%_41.87%_79.38%_41.88%]">
            <div className="absolute inset-[-0.96%]">
              <img alt="" className="block max-w-none size-full" src={imgStep04Badge} />
            </div>
          </div>
          <div className="absolute inset-[9.49%_46.72%_83.67%_46.72%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep04Shield} />
          </div>
        </div>
      );

    // 05 — Direct Proposal Bidding (178432:7285)
    case 4:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7285"
          data-testid="step-illustration-05"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep05Body} />
              </div>
            </div>
          </div>
          <div className="absolute inset-[16.25%_12.5%_70%_12.5%]">
            <div className="absolute inset-[-1.14%_-0.21%]">
              <img alt="" className="block max-w-none size-full" src={imgStep05Card} />
            </div>
          </div>
          <div className="absolute inset-[20.33%_76.27%_74.08%_18.14%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep05Icon} />
          </div>
          <div className="absolute inset-[20%_58.75%_73.75%_27.5%]">
            <div className="absolute inset-[-2.5%_-1.14%]">
              <img alt="" className="block max-w-none size-full" src={imgStep05Pill1} />
            </div>
          </div>
          <div className="absolute inset-[22.38%_61.88%_76%_30.63%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep05Pill1Active} />
          </div>
          <div className="absolute inset-[20%_40%_73.75%_43.75%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep05Pill2} />
          </div>
          <div className="absolute inset-[22.38%_43.13%_76%_46.88%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep05Pill2Active} />
          </div>
          <div className="absolute inset-[20%_23.75%_73.75%_62.5%]">
            <div className="absolute inset-[-2.5%_-1.14%]">
              <img alt="" className="block max-w-none size-full" src={imgStep05Pill1} />
            </div>
          </div>
          <div className="absolute inset-[22.38%_26.88%_76%_65.63%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep05Pill3} />
          </div>
        </div>
      );

    // 06 — Integrated Scheduling (178432:7332)
    case 5:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7332"
          data-testid="step-illustration-06"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep06Body} />
              </div>
            </div>
          </div>
          <div className="absolute inset-[13.75%_47.5%_73.75%_12.5%]">
            <div className="absolute inset-[-1.25%_-0.39%]">
              <img alt="" className="block max-w-none size-full" src={imgStep06Card} />
            </div>
          </div>
          <div className="absolute inset-[16.99%_76.48%_77.42%_18.36%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep06Icon} />
          </div>
          <div className="absolute inset-[18.75%_53.75%_78.75%_27.5%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep06Line} />
          </div>
        </div>
      );

    // 07 — Interactive AI Agent (178432:7364)
    case 6:
    default:
      return (
        <div
          className="overflow-clip relative shrink-0 size-[300px]"
          data-node-id="178432:7364"
          data-testid="step-illustration-07"
        >
          <div className="absolute contents inset-0" data-name="Mask group">
            <div
              className="absolute inset-[8.75%_14.38%_-6.25%_14.37%] mask-intersect mask-luminance mask-no-clip mask-no-repeat mask-position-[-43.125px_-26.25px] mask-size-[300px_300px]"
              style={{
                maskImage: `url("${imgPhoneMask}")`,
                WebkitMaskImage: `url("${imgPhoneMask}")`,
              }}
            >
              <div className="absolute inset-[-0.16%_-0.22%]">
                <img alt="" className="block max-w-none size-full" src={imgStep07Body} />
              </div>
            </div>
          </div>
          <div className="absolute inset-[26.25%_22.5%_55%_12.5%]">
            <div className="absolute inset-[-0.83%_-0.24%]">
              <img alt="" className="block max-w-none size-full" src={imgStep07Bubble} />
            </div>
          </div>
          <div className="absolute inset-[30.63%_74.38%_59.38%_15.63%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep07Circle} />
          </div>
          <div className="absolute inset-[32.83%_76.58%_61.58%_17.83%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep07Icon} />
          </div>
          <div className="absolute inset-[31.25%_49.38%_66.12%_29.38%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep07Line1} />
          </div>
          <div className="absolute inset-[36.56%_43.13%_60.44%_29.38%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep07Line2} />
          </div>
          <div className="absolute inset-[34.22%_27.4%_62.62%_68.2%]">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgStep07Check} />
          </div>
        </div>
      );
  }
}

export function ProductPage() {
  const navigate = useNavigate();
  const { toggle } = useTheme();

  const [loggedInUser, setLoggedInUser] = useState(appStateSync.getLoggedInUser());
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Active step in the 7-step interactive showcase (0-indexed: 0..6)
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isStepPaused, setIsStepPaused] = useState<boolean>(false);

  // Thespian AI in-place role switch ("performer" | "client")
  const [thespianRole, setThespianRole] = useState<"performer" | "client">("performer");

  // FAQ open item (null or index)
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

  // Auto-cycle through the 7 steps every 4.5s unless paused by hover/interaction
  useEffect(() => {
    if (isStepPaused) return;
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 7);
    }, 4500);
    return () => clearInterval(timer);
  }, [isStepPaused]);

  const handleSignOut = async () => {
    try {
      await apiClient.logout();
    } catch {}
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

  // 7 Interactive Showcase Steps (Figma 178432:6988)
  const steps = [
    {
      id: "01",
      title: "Sleek Bio Storefront",
      description:
        "Ditch scattered bio links for a mobile storefront that showcases your video monologues, audio reels, reach metrics, and verified reviews all in one place.",
    },
    {
      id: "02",
      title: "Custom Rate Cards & Micro-Deliverables",
      description:
        "Set clear baseline prices for gigs and fan requests so clients can book your auditions, MC hosting, voiceovers, or personalized shoutouts instantly.",
    },
    {
      id: "03",
      title: "Real-Time Performer Analytics & Visitor Intelligence",
      description:
        "See exactly who is visiting your page, which monologues they play, where they find your link, and how many views turn into paid bookings.",
    },
    {
      id: "04",
      title: "Escrow Security",
      description:
        "Never worry about non-payment or client ghosting again. Funds for gigs and custom shoutouts are deposited safely into escrow prior to production or recording and released immediately upon project completion.",
    },
    {
      id: "05",
      title: "Direct Proposal Bidding",
      description:
        "Browse open casting briefs posted by verified studios and commercial media vendors; submit auditions and proposals in seconds.",
    },
    {
      id: "06",
      title: "Integrated Scheduling",
      description:
        "Sync your calendar so visitors can book audition slots, phone consultations, or quick custom messages without back-and-forth emails.",
    },
    {
      id: "07",
      title: "Interactive AI Agent",
      description:
        "Your AI agent works while you sleep, chatting with visitors about your style and instantly booking audition slots straight onto your calendar.",
    },
  ];

  // ── 5-card sliding window (constant-height viewport) ──
  // Only STEP_VISIBLE_COUNT cards are shown at once. As the active step advances,
  // the column glides upward and the card above the window fades out of view, so
  // the showcase never changes height. Heights are measured (not animated via
  // `layout`), which avoids the scale-based layout animation that stretched
  // icons and text.
  const stepTitleRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  const stepDescRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const stepViewportRef = useRef<HTMLDivElement>(null);
  const [stepMetrics, setStepMetrics] = useState<{ inactive: number[]; desc: number[] } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const inactive = Array.from(
        { length: STEP_COUNT },
        (_, i) => Math.max(24, stepTitleRefs.current[i]?.offsetHeight ?? 0) + 48,
      );
      const desc = Array.from({ length: STEP_COUNT }, (_, i) => stepDescRefs.current[i]?.offsetHeight ?? 0);
      // jsdom / not yet laid out: fall back to natural (auto) layout.
      if (desc.every((d) => d === 0)) {
        setStepMetrics(null);
        return;
      }
      setStepMetrics((prev) =>
        prev &&
        prev.inactive.every((v, i) => v === inactive[i]) &&
        prev.desc.every((v, i) => v === desc[i])
          ? prev
          : { inactive, desc },
      );
    };
    measure();
    const ro =
      typeof ResizeObserver !== "undefined" && stepViewportRef.current ? new ResizeObserver(measure) : null;
    if (ro && stepViewportRef.current) ro.observe(stepViewportRef.current);
    document.fonts?.ready?.then(measure).catch(() => {});
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const stepWindowStart = Math.min(activeStep, STEP_COUNT - STEP_VISIBLE_COUNT);
  const stepColumnOffset = stepMetrics
    ? stepMetrics.inactive.slice(0, stepWindowStart).reduce((sum, h) => sum + h + STEP_GAP, 0)
    : 0;
  const stepViewportHeight = stepMetrics
    ? Math.max(
        ...Array.from({ length: STEP_COUNT }, (_, a) => {
          const start = Math.min(a, STEP_COUNT - STEP_VISIBLE_COUNT);
          let h = 0;
          for (let j = start; j < start + STEP_VISIBLE_COUNT; j++) h += stepMetrics.inactive[j] ?? 0;
          return h + (stepMetrics.desc[a] ?? 0) + (STEP_VISIBLE_COUNT - 1) * STEP_GAP;
        }),
      )
    : undefined;

  // 10 FAQs (Figma 178359:17958)
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
      className="min-h-screen flex flex-col items-start bg-white dark:bg-[#000000] text-[#1a1a1a] dark:text-[#f9f9f9] antialiased overflow-x-clip relative isolate w-full"
      data-node-id="178359:17305"
    >

      {/* ── 1. Top Announcement Bar (178359:17306) ── */}
      <TopAnnouncementBar nodeId="178359:17306" />

      {/* ── 2. Sticky Header (178359:17318) ── */}
      <header
        className="backdrop-blur-[12px] bg-white/95 dark:bg-[#000000]/95 border-[#e8e8e8] dark:border-[#1a1a1a] border-b border-solid flex h-[68px] items-center justify-between px-4 sm:px-8 lg:px-[64px] shrink-0 sticky top-0 w-full z-50 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.06),0px_2px_4px_-2px_rgba(0,0,0,0.06)]"
        data-node-id="178359:17318"
      >
        <div
          className="pointer-events-none absolute inset-0 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)]"
          data-node-id="178359:17319"
        />

        <div className="flex gap-[12px] items-center relative shrink-0 z-10" data-node-id="178359:17320">
          {/* Monologg SVG Logo (178359:17321) */}
          <div
            onClick={() => navigate("/")}
            className="cursor-pointer h-[24px] overflow-clip relative shrink-0 w-[105.109px]"
            data-node-id="178359:17321"
            role="button"
            aria-label="Monologg Home"
          >
            <div className="absolute contents inset-[14.02%_80.78%_14.25%_3.55%]">
              <div
                className="absolute inset-[14.93%_81%_15.21%_3.77%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.226px_-0.219px] mask-size-[16.466px_17.215px]"
                style={{
                  maskImage: `url("${imgHeaderLogoMask}")`,
                  WebkitMaskImage: `url("${imgHeaderLogoMask}")`,
                }}
              >
                <div className="absolute inset-[-1.33%_-1.39%_-1.65%_-1.39%]">
                  <img alt="" className="block max-w-none size-full dark:invert" src={imgHeaderLogoMark} />
                </div>
              </div>
            </div>
            <div className="absolute inset-[22.1%_1.22%_6.52%_24.14%]">
              <img alt="Monologg" className="absolute block inset-0 max-w-none size-full dark:invert" src={imgHeaderLogoWordmark} />
            </div>
          </div>

          {/* Nav Links (178359:17333) */}
          <nav className="hidden md:flex gap-[4px] items-center relative shrink-0" data-node-id="178359:17333">
            <button
              onClick={() => navigate("/product")}
              className="flex flex-col items-start px-[16px] py-[6px] relative rounded-full shrink-0 cursor-pointer"
              data-node-id="178359:17334"
            >
              <div className="flex gap-[10px] items-center justify-center relative shrink-0" data-node-id="178359:17335">
                <div
                  className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid relative rounded-full shrink-0 size-[8px]"
                  data-node-id="178359:17336"
                />
                <span
                  className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#f25757] text-[12px] leading-[16px] whitespace-nowrap"
                  data-node-id="178359:17337"
                >
                  Product
                </span>
              </div>
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="flex flex-col items-start px-[16px] py-[6px] relative rounded-full shrink-0 cursor-pointer font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap"
              data-node-id="178359:17338"
            >
              Pricing
            </button>
            <button
              onClick={() => navigate("/resources")}
              className="flex flex-col items-start px-[16px] py-[6px] relative rounded-full shrink-0 cursor-pointer font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[#484848] dark:text-[#bababa] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] text-[12px] leading-[16px] transition-colors whitespace-nowrap"
              data-node-id="178359:17340"
            >
              Resources
            </button>
          </nav>
        </div>

        {/* Right Controls (178359:17344) */}
        <div className="flex gap-[12px] items-center relative shrink-0 z-10" data-node-id="178359:17344">
          <button
            onClick={toggle}
            className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex items-center justify-center relative rounded-full shrink-0 size-[36px] cursor-pointer hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors"
            data-node-id="178359:17345"
            aria-label="Toggle theme"
          >
            <div className="relative shrink-0 size-[16px]" data-node-id="178359:17346">
              <img alt="" className="absolute block inset-0 max-w-none size-full dark:invert" src={imgThemeToggleSvg} />
            </div>
          </button>

          {loggedInUser ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex items-center gap-1.5 rounded-full p-1 pr-2 border border-[#e8e8e8] dark:border-[#1a1a1a] bg-white dark:bg-[#000000] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-all active:scale-95 shadow-sm cursor-pointer"
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
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-[#1a1a1a] dark:text-[#f9f9f9] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                        >
                          <item.icon className="w-4 h-4 text-[#767676] dark:text-[#a3a3a3]" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="py-1.5 border-t border-[#e8e8e8] dark:border-[#1a1a1a]">
                      <button
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
            <div className="flex items-center gap-[12px]">
              <button
                onClick={() => navigate("/auth?mode=signin")}
                className="border border-[#d1d1d1] dark:border-[#1a1a1a] border-solid flex h-[40px] items-center justify-center pb-[11.5px] pt-[10.5px] px-[20px] relative rounded-full shrink-0 font-['Plus_Jakarta_Sans',sans-serif] font-bold text-[#1a1a1a] dark:text-[#f9f9f9] text-[12px] leading-[16px] tracking-[-0.12px] hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors cursor-pointer"
                data-node-id="178359:17348"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate("/auth?mode=signup")}
                className="bg-[#f13030] hover:bg-[#d31f20] flex h-[40px] items-center justify-center pb-[12.5px] pt-[11.5px] px-[20px] relative rounded-full shrink-0 shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] font-['Plus_Jakarta_Sans',sans-serif] font-bold text-white text-[12px] leading-[16px] tracking-[-0.12px] transition-all active:scale-95 cursor-pointer"
                data-node-id="178359:17350"
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
        activePage="product"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        loggedInUser={loggedInUser}
        displayName={loggedInUser?.name}
        displayAvatar={userAvatarUrl ?? undefined}
        isClientSession={loggedInUser?.userType === "CLIENT"}
        onSignOut={handleSignOut}
      />

      {/* ── Main Content Container ── */}
      <main className="flex-1 flex flex-col items-center w-full relative z-10">
        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 1: PERFORMER PORTAL (178359:17364)
            Includes Hero (178359:17378) + 7-Step Interactive Showcase (178359:17392)
            with 3 states per card (default / active / completed) and the 7 extracted
            300x300 Figma SVG illustrations in the right-hand preview box (no duplicate section).
        ════════════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-4 sm:px-8 xl:px-[200px] py-[80px] lg:py-[112px] relative w-full"
          data-node-id="178359:17364"
        >
          {/* Performer Portal Hero Header (178359:17378) */}
          <div
            className="flex flex-col gap-[32px] items-center relative shrink-0 w-full max-w-[1040px]"
            data-node-id="178359:17378"
          >
            <div
              className="flex flex-col gap-[20px] items-center relative shrink-0"
              data-node-id="178359:17379"
            >
              <div
                className="flex flex-col gap-[12px] items-center relative shrink-0"
                data-node-id="178359:17380"
              >
                <div
                  className="flex gap-[10px] items-center justify-center relative shrink-0"
                  data-node-id="178359:17381"
                >
                  <div
                    className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid relative rounded-full shrink-0 size-[8px]"
                    data-node-id="178359:17382"
                  />
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[#f13030] text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17383"
                  >
                    Performer Portal
                  </span>
                </div>
                <h1
                  className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[40px] sm:text-[56px] lg:text-[64px] leading-tight sm:leading-[1.1] text-center tracking-[-1.92px] max-w-[820px]"
                  data-node-id="178359:17384"
                >
                  Build your personal <br className="hidden sm:inline" />digital stage
                </h1>
              </div>
              <p
                className="font-['Inter_Tight',sans-serif] font-normal leading-[26px] text-[#767676] dark:text-[#a3a3a3] text-[18px] text-center tracking-[0.54px] max-w-[664px]"
                data-node-id="178359:17385"
              >
                Pitch on live casting briefs, set your custom service rates, track customer
                analytics, and get paid securely.
              </p>
            </div>

            <div className="flex items-center relative shrink-0" data-node-id="178359:17386">
              <button
                onClick={() => navigate(loggedInUser ? "/dashboard" : "/auth?mode=signup&role=talent")}
                className="bg-[#f13030] hover:bg-[#d31f20] text-white flex gap-[8px] h-[40px] items-center justify-center overflow-clip px-[24px] py-[8px] relative rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 cursor-pointer transition-all active:scale-95"
                data-node-id="178359:17387"
              >
                <span
                  className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] leading-[16px] text-center text-white tracking-[-0.12px] whitespace-nowrap"
                  data-node-id="178359:17389"
                >
                  Get started for free
                </span>
                <div className="relative shrink-0 size-[16px]" data-node-id="178359:17390">
                  <img
                    alt=""
                    className="absolute block inset-0 max-w-none size-full"
                    src={imgIconArrowRightWhite}
                  />
                </div>
              </button>
            </div>
          </div>

          {/* 7-Step Interactive Feature Showcase (178359:17392) */}
          <div
            className="flex flex-col items-start justify-center relative shrink-0 w-full max-w-[1040px]"
            data-node-id="178359:17392"
            onMouseEnter={() => setIsStepPaused(true)}
            onMouseLeave={() => setIsStepPaused(false)}
          >
            <div
              className="flex flex-col lg:flex-row gap-[24px] items-start relative shrink-0 w-full"
              data-node-id="178359:17393"
            >
              {/* Left Column: 7 Step Cards in a constant-height 5-card sliding window (178359:17394) */}
              <div
                ref={stepViewportRef}
                className="relative overflow-hidden shrink-0 w-full lg:w-[491px]"
                style={{ height: stepViewportHeight }}
                data-node-id="178359:17394"
              >
                <motion.div
                  className="flex flex-col gap-[12px] items-start w-full will-change-transform"
                  initial={false}
                  animate={{ y: -stepColumnOffset }}
                  transition={{ duration: STEP_DURATION, ease: STEP_EASE }}
                >
                  {steps.map((step, idx) => {
                    const cardState: "completed" | "active" | "default" =
                      idx < activeStep ? "completed" : idx === activeStep ? "active" : "default";
                    const isActive = cardState === "active";
                    const inWindow = idx >= stepWindowStart && idx < stepWindowStart + STEP_VISIBLE_COUNT;
                    const descTarget: number | "auto" = stepMetrics ? (stepMetrics.desc[idx] ?? 0) : "auto";

                    return (
                      <motion.div
                        key={step.id}
                        onClick={() => setActiveStep(idx)}
                        role="button"
                        tabIndex={inWindow ? 0 : -1}
                        aria-expanded={isActive}
                        aria-hidden={inWindow ? undefined : true}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setActiveStep(idx);
                          }
                        }}
                        data-step-state={cardState}
                        data-testid={`step-card-${step.id}`}
                        initial={false}
                        animate={{ opacity: inWindow ? 1 : 0 }}
                        transition={{ duration: STEP_DURATION * 0.75, ease: STEP_EASE }}
                        style={{ pointerEvents: inWindow ? "auto" : "none" }}
                        className={`relative flex w-full shrink-0 items-start gap-[24px] p-[24px] rounded-[12px] cursor-pointer outline-none focus:outline-none focus-visible:outline-none transition-[background-color,box-shadow] duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                          isActive
                            ? "bg-[#f9f9f9] dark:bg-[#0e0e0e] shadow-[inset_0_0_0_1px_transparent]"
                            : "bg-white dark:bg-black shadow-[inset_0_0_0_1px_#e8e8e8] dark:shadow-[inset_0_0_0_1px_#1a1a1a] hover:bg-[#f9f9f9] dark:hover:bg-[#0e0e0e]"
                        }`}
                      >
                        {/* Leading slot: number (default/completed) crossfades into ArrowCircleRight (active) */}
                        <div className="relative shrink-0 size-[24px]">
                          <span
                            className={`absolute inset-0 flex items-center font-['Switzer',sans-serif] font-medium text-[18px] leading-[24px] tabular-nums whitespace-nowrap transition-opacity duration-500 ${
                              isActive ? "opacity-0" : "opacity-100"
                            } ${cardState === "completed" ? "text-[#333333] dark:text-[#f8f8f8]" : "text-[#bababa]"}`}
                          >
                            {step.id}
                          </span>
                          <span
                            className={`absolute inset-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] ${
                              isActive ? "opacity-100 scale-100" : "opacity-0 scale-75"
                            }`}
                            data-name="ArrowCircleRight"
                          >
                            <img
                              alt=""
                              className="absolute block dark:hidden inset-0 size-full object-contain"
                              src={imgArrowCircleRightLight}
                            />
                            <img
                              alt=""
                              className="absolute hidden dark:block inset-0 size-full object-contain"
                              src={imgArrowCircleRightDark}
                            />
                          </span>
                        </div>

                        {/* Text column (Frame 2147228254): width is identical in every state so heights stay stable */}
                        <div className="flex min-w-0 flex-1 flex-col items-start">
                          <h3
                            ref={(el) => {
                              stepTitleRefs.current[idx] = el;
                            }}
                            className={`w-full pr-[48px] font-['Switzer',sans-serif] font-medium text-[18px] leading-[24px] transition-colors duration-500 ${
                              cardState === "default"
                                ? "text-[#484848] dark:text-[#bababa]"
                                : "text-[#1a1a1a] dark:text-[#f5f5f5]"
                            }`}
                          >
                            {step.title}
                          </h3>
                          <motion.div
                            initial={false}
                            animate={{ height: isActive ? descTarget : 0, opacity: isActive ? 1 : 0 }}
                            transition={{
                              height: { duration: STEP_DURATION, ease: STEP_EASE },
                              opacity: isActive
                                ? { duration: 0.5, delay: 0.25, ease: STEP_EASE }
                                : { duration: 0.25, ease: STEP_EASE },
                            }}
                            className="w-full overflow-hidden"
                            aria-hidden={!isActive}
                          >
                            <p
                              ref={(el) => {
                                stepDescRefs.current[idx] = el;
                              }}
                              className="w-full pt-[8px] font-['Inter_Tight',sans-serif] font-normal text-[16px] leading-[24px] tracking-[0.48px] text-[#767676] dark:text-[#a3a3a3]"
                            >
                              {step.description}
                            </p>
                          </motion.div>
                        </div>

                        {/* Trailing status icon (absolutely positioned so it never reflows the text column) */}
                        <span
                          className={`pointer-events-none absolute right-[24px] top-[24px] size-[24px] transition-opacity duration-500 ${
                            cardState === "completed" ? "opacity-100" : "opacity-0"
                          }`}
                          data-name="CheckCircle"
                        >
                          <img
                            alt={cardState === "completed" ? "Completed" : ""}
                            className="absolute block inset-0 size-full object-contain"
                            src={imgCheckCircle}
                          />
                        </span>
                        <span
                          className={`pointer-events-none absolute right-[24px] top-[24px] size-[24px] transition-opacity duration-500 ${
                            cardState === "default" ? "opacity-70" : "opacity-0"
                          }`}
                          data-name="Spinner"
                        >
                          <img
                            alt={cardState === "default" ? "Pending" : ""}
                            className="absolute block inset-0 size-full object-contain animate-[spin_3s_linear_infinite]"
                            src={imgSpinner}
                          />
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Right Column: Dynamic 525x484 Stage Rendering the Active Step's 300x300 Figma SVG Illustration (178359:17450) */}
              <div
                className="hidden lg:flex bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] h-[484px] items-center justify-center relative rounded-[20px] shrink-0 w-full lg:w-[525px] lg:sticky lg:top-[100px]"
                data-node-id="178359:17450"
              >
                <div
                  className="bg-[#f9f9f9] dark:bg-[#1a1a1a] flex flex-col h-full items-center justify-center overflow-clip relative rounded-[20px] shrink-0"
                  data-node-id="178359:17451"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4, ease: STEP_EASE }}
                    >
                      <StepIllustration stepIndex={activeStep} />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Dashed Horizontal Divider (178359:17764) ── */}
        <div className="h-0 relative shrink-0 w-full overflow-hidden" data-node-id="178359:17764">
          <div className="relative w-full h-[2px]">
            <img alt="" className="block w-full h-full object-cover dark:opacity-30 dark:invert" src={imgDashedDivider} />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 2: CLIENT PORTAL (178359:17765)
            Includes Header (178359:17766) + 2x2 Feature Grid (178359:17785) +
            6 Studio Logos Bar (178359:17816)
        ════════════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-4 sm:px-8 xl:px-[200px] py-[80px] lg:py-[112px] relative w-full"
          data-node-id="178359:17765"
        >
          {/* Client Portal Header (178359:17766) */}
          <div
            className="flex flex-col gap-[32px] items-center relative shrink-0 w-full max-w-[948px]"
            data-node-id="178359:17766"
          >
            <div
              className="flex flex-col gap-[20px] items-center relative shrink-0 w-full"
              data-node-id="178359:17767"
            >
              <div
                className="flex flex-col gap-[12px] items-center relative shrink-0 w-full"
                data-node-id="178359:17768"
              >
                <div
                  className="flex gap-[10px] items-center justify-center relative shrink-0"
                  data-node-id="178359:17769"
                >
                  <div
                    className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid relative rounded-full shrink-0 size-[8px]"
                    data-node-id="178359:17770"
                  />
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[#f13030] text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17771"
                  >
                    client Portal
                  </span>
                </div>
                <h2
                  className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[40px] sm:text-[56px] lg:text-[64px] leading-none text-center tracking-[-1.92px] max-w-[948px]"
                  data-node-id="178359:17772"
                >
                  The Upwork for Performer Acquisition
                </h2>
              </div>
              <p
                className="font-['Inter_Tight',sans-serif] font-normal leading-[26px] text-[#767676] dark:text-[#a3a3a3] text-[18px] text-center tracking-[0.54px] max-w-[546px]"
                data-node-id="178359:17773"
              >
                A professional performer acquisition network built for production houses,
                casting directors, brand managers, live event organizers, and fans.
              </p>
            </div>

            <button
              onClick={() => navigate(loggedInUser ? "/client" : "/auth?mode=signup&role=client")}
              className="bg-[#f13030] hover:bg-[#d31f20] text-white flex gap-[8px] h-[40px] items-center justify-center overflow-clip px-[24px] py-[8px] relative rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 cursor-pointer transition-all active:scale-95"
              data-node-id="178359:17774"
            >
              <span
                className="font-['Plus_Jakarta_Sans',sans-serif] font-semibold text-[14px] leading-[16px] text-center text-white tracking-[-0.12px] whitespace-nowrap"
                data-node-id="178359:17776"
              >
                Get started for free
              </span>
              <div className="relative shrink-0 size-[16px]" data-node-id="178359:17777">
                <img
                  alt=""
                  className="absolute block inset-0 max-w-none size-full"
                  src={imgIconArrowRightWhite}
                />
              </div>
            </button>
          </div>

          {/* 2x2 Feature Grid + Bottom Trust Bar (178359:17784) */}
          <div
            className="flex flex-col items-center relative shrink-0 w-full max-w-[1040px]"
            data-node-id="178359:17784"
          >
            {/* 2x2 Bordered Box (178359:17785) */}
            <div
              className="bg-white dark:bg-[#000000] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex flex-col gap-[32px] items-center p-6 sm:p-[32px] relative rounded-[20px] shrink-0 w-full max-w-[1000px]"
              data-node-id="178359:17785"
            >
              {/* Row 1 (178359:17786) */}
              <div
                className="bg-white dark:bg-[#000000] flex flex-col md:flex-row gap-[24px] items-center relative shrink-0 w-full"
                data-node-id="178359:17786"
              >
                {/* Card 1: Verified Creator Pool */}
                <div
                  className="flex flex-[1_0_0] flex-col items-start min-w-px relative w-full"
                  data-node-id="178359:17787"
                >
                  <div
                    className="flex flex-col gap-[32px] items-center relative shrink-0 w-full"
                    data-node-id="178359:17788"
                  >
                    <div
                      className="relative shrink-0 size-[24px]"
                      data-node-id="178359:17789"
                      data-name="SealCheck"
                    >
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full dark:invert"
                        src={imgSealCheck}
                      />
                    </div>
                    <div
                      className="flex flex-col gap-[20px] items-center relative shrink-0 w-full"
                      data-node-id="178359:17790"
                    >
                      <h3
                        className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] text-center whitespace-nowrap"
                        data-node-id="178359:17792"
                      >
                        Verified Creator Pool
                      </h3>
                      <p
                        className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] text-center tracking-[0.48px] w-full"
                        data-node-id="178359:17793"
                      >
                        Browse rich, data-verified candidate pipelines across Actors,
                        Comedians, Voiceover Artistes, Comperes, Musicians, Public speakers,
                        Streamers, and Content Creators.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider (178359:17794) */}
                <div
                  className="hidden md:block h-[148px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:17794"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={imgClientVertDivider}
                    />
                  </div>
                </div>

                {/* Card 2: Chat with AI Performer Profiles */}
                <div
                  className="flex flex-[1_0_0] flex-col items-start min-w-px relative w-full"
                  data-node-id="178359:17795"
                >
                  <div
                    className="flex flex-col gap-[32px] items-center relative shrink-0 w-full"
                    data-node-id="178359:17796"
                  >
                    <div
                      className="relative shrink-0 size-[24px]"
                      data-node-id="178359:17797"
                      data-name="chat-4-fill"
                    >
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full dark:invert"
                        src={imgChat4Fill}
                      />
                    </div>
                    <div
                      className="flex flex-col gap-[20px] items-center relative shrink-0 w-full"
                      data-node-id="178359:17798"
                    >
                      <h3
                        className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] text-center whitespace-nowrap"
                        data-node-id="178359:17799"
                      >
                        Chat with AI Performer Profiles
                      </h3>
                      <p
                        className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] text-center tracking-[0.48px] w-full"
                        data-node-id="178359:17800"
                      >
                        Instant Q&amp;A with a performer&apos;s AI agent to verify
                        availability, review project fits, book audition slots, or request
                        custom video drops in seconds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Horizontal Divider (178359:17801) */}
              <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17801">
                <div className="absolute inset-[-0.5px_0]">
                  <img
                    alt=""
                    className="block max-w-none size-full"
                    src={imgClientHorizDivider}
                  />
                </div>
              </div>

              {/* Row 2 (178359:17802) */}
              <div
                className="bg-white dark:bg-[#000000] flex flex-col md:flex-row gap-[24px] items-center relative shrink-0 w-full"
                data-node-id="178359:17802"
              >
                {/* Card 3: Post Gigs & Micro-Briefs */}
                <div
                  className="flex flex-[1_0_0] flex-col items-center min-w-px relative w-full"
                  data-node-id="178359:17803"
                >
                  <div
                    className="flex flex-col gap-[32px] items-center relative shrink-0 w-full"
                    data-node-id="178359:17804"
                  >
                    <div
                      className="relative shrink-0 size-[24px]"
                      data-node-id="178359:17805"
                      data-name="NotePencil"
                    >
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full dark:invert"
                        src={imgNotePencil}
                      />
                    </div>
                    <div
                      className="flex flex-col gap-[20px] items-center relative shrink-0 text-center w-full"
                      data-node-id="178359:17806"
                    >
                      <h3
                        className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-full"
                        data-node-id="178359:17807"
                      >
                        Post Gigs &amp; Micro-Briefs
                      </h3>
                      <p
                        className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full"
                        data-node-id="178359:17808"
                      >
                        Publish creative briefs, indie movie roles, corporate event jobs, or
                        direct shoutout requests in minutes and receive direct, structured
                        applications or instant fulfillments.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Vertical Divider (178359:17809) */}
                <div
                  className="hidden md:block h-[148px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:17809"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={imgClientVertDivider}
                    />
                  </div>
                </div>

                {/* Card 4: Secure Contracts & Escrow Payments */}
                <div
                  className="flex flex-[1_0_0] flex-row items-center self-stretch w-full"
                  data-node-id="178359:17810"
                >
                  <div className="flex flex-[1_0_0] flex-col h-full items-center min-w-px relative w-full">
                    <div
                      className="flex flex-col gap-[32px] items-center relative shrink-0 w-full"
                      data-node-id="178359:17811"
                    >
                      <div
                        className="relative shrink-0 size-[24px]"
                        data-node-id="178359:17812"
                        data-name="lock-fill"
                      >
                        <img
                          alt=""
                          className="absolute block inset-0 max-w-none size-full dark:invert"
                          src={imgLockFill}
                        />
                      </div>
                      <div
                        className="flex flex-col gap-[20px] items-center relative shrink-0 w-full"
                        data-node-id="178359:17813"
                      >
                        <h3
                          className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] text-center whitespace-nowrap"
                          data-node-id="178359:17814"
                        >
                          Secure Contracts &amp; Escrow Payments
                        </h3>
                        <p
                          className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] text-center tracking-[0.48px] w-full"
                          data-node-id="178359:17815"
                        >
                          Sign standard digital agreements with built-in milestones and escrow
                          payment safety.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 3: THESPIAN AI (178359:17831)
            Renders the exact Performer AI 5-row table (178359:17846) AND Client AI
            3-row table (178359:17909) from Figma 178359:17831
        ════════════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center px-4 sm:px-8 xl:px-[200px] relative w-full"
          data-node-id="178359:17831"
        >
          {/* Top Dashed Divider (178359:17832) */}
          <div className="h-0 relative shrink-0 w-full overflow-hidden" data-node-id="178359:17832">
            <div className="relative w-full h-[2px]">
              <img alt="" className="block w-full h-full object-cover dark:opacity-30 dark:invert" src={imgDashedDivider} />
            </div>
          </div>

          {/* Thespian AI Section Header (178359:17833) */}
          <div
            className="flex items-start justify-center relative shrink-0 w-full"
            data-node-id="178359:17833"
          >
            <div
              className="flex flex-col gap-[20px] items-center relative shrink-0 w-full max-w-[710px]"
              data-node-id="178359:17834"
            >
              <div
                className="flex flex-col gap-[12px] items-center relative shrink-0"
                data-node-id="178359:17835"
              >
                <div
                  className="flex gap-[10px] items-center justify-center relative shrink-0"
                  data-node-id="178359:17836"
                >
                  <div
                    className="bg-[rgba(241,48,48,0.8)] border border-[rgba(241,48,48,0.4)] border-solid relative rounded-full shrink-0 size-[8px]"
                    data-node-id="178359:17837"
                  />
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[#f13030] text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17838"
                  >
                    Thespian ai
                  </span>
                </div>
                <h2
                  className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[40px] sm:text-[56px] lg:text-[64px] leading-none text-center tracking-[-1.92px] max-w-[670px]"
                  data-node-id="178359:17839"
                >
                  Performance Intelligence Engine
                </h2>
              </div>
              <p
                className="font-['Inter_Tight',sans-serif] font-normal leading-[26px] text-[#767676] dark:text-[#a3a3a3] text-[18px] text-center tracking-[0.54px] max-w-[710px]"
                data-node-id="178359:17840"
              >
                Say goodbye to manual form fatigue and endless email threads. Thespian AI works
                for both sides of the stage` acting as an untiring, 24/7 digital agent for
                performers and an automated casting butler for studios.
              </p>
            </div>
          </div>

          {/* ── Sub-Block A: What Thespian AI Does for the Performer (178359:17846) ── */}
          <div
            className={`flex-col items-center justify-center overflow-clip relative rounded-[32px] shrink-0 w-full ${
              thespianRole === "performer" ? "flex" : "hidden"
            }`}
            data-node-id="178359:17846"
          >
            <div
              className="flex flex-col gap-[40px] items-center relative shrink-0 w-full max-w-[910px]"
              data-node-id="178359:17847"
            >
              {/* Role Indicator + Subheading (178359:17848) */}
              <div
                className="flex flex-col gap-[12px] items-center relative shrink-0"
                data-node-id="178359:17848"
              >
                <div
                  className="flex gap-[8px] items-center p-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-full border border-[#e8e8e8] dark:border-[#1a1a1a]"
                  data-node-id="178359:17849"
                >
                  <button
                    type="button"
                    aria-label="Performers"
                    onClick={() => setThespianRole("performer")}
                    className="flex gap-[8px] items-center px-4 py-1.5 rounded-full bg-white dark:bg-[#333333] text-[#1a1a1a] dark:text-[#f9f9f9] shadow-sm font-semibold transition-all duration-200 cursor-pointer"
                  >
                    <div
                      className="bg-[rgba(0,0,0,0.8)] dark:bg-[#f9f9f9] border border-[rgba(0,0,0,0.4)] dark:border-[#1a1a1a] border-solid relative rounded-full shrink-0 size-[8px]"
                      data-node-id="178359:17851"
                    />
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#1a1a1a] dark:text-[#f9f9f9] tracking-[1.26px] uppercase whitespace-nowrap"
                      data-node-id="178359:17852"
                    >
                      PERFORMER
                    </span>
                  </button>
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#bababa] dark:text-[#767676] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17854"
                  >
                    |
                  </span>
                  <button
                    type="button"
                    aria-label="Clients"
                    onClick={() => setThespianRole("client")}
                    className="flex gap-[8px] items-center px-4 py-1.5 rounded-full text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer"
                  >
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                      data-node-id="178359:17857"
                    >
                      CLIENT
                    </span>
                  </button>
                </div>

                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium items-center text-[#1a1a1a] dark:text-[#f9f9f9] text-[24px] sm:text-[32px] text-center tracking-[-0.96px]"
                  data-node-id="178359:17858"
                >
                  <h3 className="leading-[40px]" data-node-id="178359:17859">
                    What Thespian AI Does for the Performer
                  </h3>
                  <p className="leading-[40px] opacity-30 text-[#1a1a1a] dark:text-[#f9f9f9]" data-node-id="178359:17860">
                    Your Digital AI Agent
                  </p>
                </div>
              </div>

              {/* Performer AI 5-Row Feature Table (178359:17861) */}
              <div
                className="flex flex-col gap-[24px] items-center relative rounded-[20px] shrink-0 w-full max-w-[910px]"
                data-node-id="178359:17861"
              >
                {/* Row 1: Instant AI Onboarding (178359:17863) */}
                <div
                  className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                  data-node-id="178359:17863"
                >
                  <div
                    className="flex flex-col gap-[10px] items-start justify-center relative shrink-0"
                    data-node-id="178359:17864"
                  >
                    <h4
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                      data-node-id="178359:17866"
                    >
                      Instant AI Onboarding
                    </h4>
                  </div>
                  <div
                    className="hidden md:block h-[116px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                    data-node-id="178359:17867"
                  >
                    <div className="absolute inset-[0_-0.5px]">
                      <img alt="" className="block max-w-none size-full" src={imgThespianVert116} />
                    </div>
                  </div>
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                    data-node-id="178359:17868"
                  >
                    Upload a monologue or audio reel, Thespian AI analyzes your media to
                    automatically detect your vocal texture (pitch, accent, projection),
                    comedic timing, and stage presence filling out your performance attributes
                    automatically without having to fill tedious forms.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17869">
                  <div className="absolute inset-[-0.5px_0]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                  </div>
                </div>

                {/* Row 2: 24/7 AI Booking Agent (178359:17870) */}
                <div
                  className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                  data-node-id="178359:17870"
                >
                  <div
                    className="flex flex-col gap-[10px] items-start justify-center relative shrink-0"
                    data-node-id="178359:17873"
                  >
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                      data-node-id="178359:17874"
                    >
                      coming soon
                    </span>
                    <h4
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                      data-node-id="178359:17875"
                    >
                      24/7 AI Booking Agent
                    </h4>
                  </div>
                  <div
                    className="hidden md:block h-[60px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                    data-node-id="178359:17876"
                  >
                    <div className="absolute inset-[0_-0.5px]">
                      <img alt="" className="block max-w-none size-full" src={imgThespianVert60} />
                    </div>
                  </div>
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                    data-node-id="178359:17877"
                  >
                    Let visitors chat with your profile about your roles and book auditions
                    directly onto your calendar anytime.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17878">
                  <div className="absolute inset-[-0.5px_0]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                  </div>
                </div>

                {/* Row 3: Automatic Gig Pitching (178359:17879) */}
                <div
                  className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                  data-node-id="178359:17879"
                >
                  <div
                    className="flex flex-col gap-[10px] items-start justify-center relative shrink-0"
                    data-node-id="178359:17882"
                  >
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                      data-node-id="178359:17883"
                    >
                      coming soon
                    </span>
                    <h4
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                      data-node-id="178359:17884"
                    >
                      Automatic Gig Pitching
                    </h4>
                  </div>
                  <div
                    className="hidden md:block h-[60px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                    data-node-id="178359:17885"
                  >
                    <div className="absolute inset-[0_-0.5px]">
                      <img alt="" className="block max-w-none size-full" src={imgThespianVert60} />
                    </div>
                  </div>
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                    data-node-id="178359:17886"
                  >
                    Thespian constantly scans script PDFs and casting calls, pitching your
                    profile the moment a role matches your talent and rates.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17887">
                  <div className="absolute inset-[-0.5px_0]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                  </div>
                </div>

                {/* Row 4: Contract Guardrails (178359:17888) */}
                <div
                  className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                  data-node-id="178359:17888"
                >
                  <div
                    className="flex gap-[10px] items-center justify-center relative shrink-0"
                    data-node-id="178359:17889"
                  >
                    <h4
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                      data-node-id="178359:17891"
                    >
                      Contract Guardrails
                    </h4>
                  </div>
                  <div
                    className="hidden md:block h-[60px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                    data-node-id="178359:17892"
                  >
                    <div className="absolute inset-[0_-0.5px]">
                      <img alt="" className="block max-w-none size-full" src={imgThespianVert60} />
                    </div>
                  </div>
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                    data-node-id="178359:17893"
                  >
                    AI automatically checks briefs for unfair terms and ensures booking funds
                    are safely in escrow before you work.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17894">
                  <div className="absolute inset-[-0.5px_0]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                  </div>
                </div>

                {/* Row 5: AI Rehearsal Partner (178359:17895) */}
                <div
                  className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                  data-node-id="178359:17895"
                >
                  <div
                    className="flex flex-col gap-[8px] items-start relative shrink-0"
                    data-node-id="178359:17896"
                  >
                    <span
                      className="font-['Geist_Mono',monospace] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                      data-node-id="178359:17897"
                    >
                      coming soon
                    </span>
                    <h4
                      className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                      data-node-id="178359:17898"
                    >
                      AI Rehearsal Partner
                    </h4>
                  </div>
                  <div
                    className="hidden md:block h-[60px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                    data-node-id="178359:17899"
                  >
                    <div className="absolute inset-[0_-0.5px]">
                      <img alt="" className="block max-w-none size-full" src={imgThespianVert60} />
                    </div>
                  </div>
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                    data-node-id="178359:17900"
                  >
                    Upload audition scripts to get character breakdowns and practice your
                    lines with an interactive AI reader.
                  </p>
                </div>

                {/* Divider */}
                <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17901">
                  <div className="absolute inset-[-0.5px_0]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                  </div>
                </div>

                {/* Bottom CTA Bar (178359:17902) */}
                <div
                  className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] flex items-center justify-between px-[20px] py-[16px] relative rounded-[20px] shrink-0 w-full"
                  data-node-id="178359:17902"
                >
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[20px] text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] tracking-[0.42px]"
                    data-node-id="178359:17903"
                  >
                    Start finding gigs
                  </p>
                  <button
                    onClick={() => navigate(loggedInUser ? "/dashboard" : "/auth?mode=signup&role=talent")}
                    className="flex gap-[12px] h-[24px] items-center justify-end py-[4px] relative shrink-0 cursor-pointer group"
                    data-node-id="178359:17904"
                  >
                    <span
                      className="font-['Inter_Tight',sans-serif] font-medium leading-[20px] text-[#f13030] text-[14px] tracking-[0.42px] whitespace-nowrap group-hover:underline"
                      data-node-id="178359:17905"
                    >
                      Get started for free
                    </span>
                    <div className="relative shrink-0 size-[16px]" data-node-id="178359:17906">
                      <img
                        alt=""
                        className="absolute block inset-0 max-w-none size-full"
                        src={imgIconArrowRightRed}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sub-Block B: What Thespian AI Does for the Client (178359:17909) ── */}
          <div
            className={`flex-col gap-[40px] items-center relative shrink-0 w-full max-w-[910px] ${
              thespianRole === "client" ? "flex" : "hidden"
            }`}
            data-node-id="178359:17909"
          >
            {/* Role Indicator + Subheading (178359:17910) */}
            <div
              className="flex flex-col gap-[12px] items-center relative shrink-0 w-full"
              data-node-id="178359:17910"
            >
              <div
                className="flex gap-[8px] items-center p-1 bg-[#f5f5f5] dark:bg-[#1a1a1a] rounded-full border border-[#e8e8e8] dark:border-[#1a1a1a]"
                data-node-id="178359:17911"
              >
                <button
                  type="button"
                  aria-label="Performers"
                  onClick={() => setThespianRole("performer")}
                  className="flex gap-[8px] items-center px-4 py-1.5 rounded-full text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] opacity-60 hover:opacity-100 transition-all duration-200 cursor-pointer"
                >
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17914"
                  >
                    PERFORMER
                  </span>
                </button>
                <span
                  className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#bababa] dark:text-[#767676] tracking-[1.26px] uppercase whitespace-nowrap"
                  data-node-id="178359:17916"
                >
                  |
                </span>
                <button
                  type="button"
                  aria-label="Clients"
                  onClick={() => setThespianRole("client")}
                  className="flex gap-[8px] items-center px-4 py-1.5 rounded-full bg-white dark:bg-[#333333] text-[#1a1a1a] dark:text-[#f9f9f9] shadow-sm font-semibold transition-all duration-200 cursor-pointer"
                >
                  <div
                    className="bg-[rgba(0,0,0,0.8)] dark:bg-[#f9f9f9] border border-[rgba(0,0,0,0.4)] dark:border-[#1a1a1a] border-solid relative rounded-full shrink-0 size-[8px]"
                    data-node-id="178359:17918"
                  />
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[14px] leading-[18px] text-[#1a1a1a] dark:text-[#f9f9f9] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17919"
                  >
                    CLIENT
                  </span>
                </button>
              </div>

              <div
                className="flex flex-col font-['Switzer',sans-serif] font-medium items-center text-[#1a1a1a] dark:text-[#f9f9f9] text-[24px] sm:text-[32px] text-center tracking-[-0.96px]"
                data-node-id="178359:17920"
              >
                <h3 className="leading-[40px]" data-node-id="178359:17921">
                  What Thespian AI Does for the Client
                </h3>
                <p className="leading-[40px] opacity-30 text-[#1a1a1a] dark:text-[#f9f9f9]" data-node-id="178359:17922">
                  Your Automated Casting Butler
                </p>
              </div>
            </div>

            {/* Client AI 3-Row Feature Table (178359:17923) */}
            <div
              className="flex flex-col gap-[24px] items-center relative shrink-0 w-full"
              data-node-id="178359:17923"
            >
              {/* Top Divider (178359:17924) */}
              <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17924">
                <div className="absolute inset-[-0.5px_0]">
                  <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                </div>
              </div>

              {/* Row 1: Vibe & Texture Matching (178359:17925) */}
              <div
                className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                data-node-id="178359:17925"
              >
                <div
                  className="flex flex-col gap-[10px] items-start justify-center relative shrink-0"
                  data-node-id="178359:17926"
                >
                  <div
                    className="relative shrink-0 size-[24px]"
                    data-node-id="178359:17927"
                    data-name="NotePencil"
                  >
                    <img
                      alt=""
                      className="absolute block inset-0 max-w-none size-full dark:invert"
                      src={imgNotePencil}
                    />
                  </div>
                  <h4
                    className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                    data-node-id="178359:17928"
                  >
                    Vibe &amp; Texture Matching
                  </h4>
                </div>
                <div
                  className="hidden md:block h-[116px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:17929"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianVert116} />
                  </div>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                  data-node-id="178359:17930"
                >
                  Match performers based on actual artistic texture, including comedic timing,
                  vocal cadence, accent, and stage presence.
                </p>
              </div>

              {/* Divider */}
              <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17931">
                <div className="absolute inset-[-0.5px_0]">
                  <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                </div>
              </div>

              {/* Row 2: Automated Logistics (178359:17932) */}
              <div
                className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                data-node-id="178359:17932"
              >
                <div
                  className="flex flex-col gap-[10px] items-start justify-center relative shrink-0"
                  data-node-id="178359:17935"
                >
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17936"
                  >
                    coming soon
                  </span>
                  <h4
                    className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                    data-node-id="178359:17937"
                  >
                    Automated Logistics
                  </h4>
                </div>
                <div
                  className="hidden md:block h-[60px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:17938"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianVert60} />
                  </div>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                  data-node-id="178359:17939"
                >
                  Automatically handle identity verification, availability checks, audition
                  invites, calendar scheduling, and escrow protection.
                </p>
              </div>

              {/* Divider */}
              <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17940">
                <div className="absolute inset-[-0.5px_0]">
                  <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                </div>
              </div>

              {/* Row 3: Script & Prompt Parsing (178359:17941) */}
              <div
                className="hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] flex flex-col md:flex-row items-start md:items-center justify-between p-[24px] relative rounded-[20px] shrink-0 w-full gap-4 transition-all duration-200 ease-out hover:scale-[1.005] cursor-pointer group"
                data-node-id="178359:17941"
              >
                <div
                  className="flex flex-col gap-[8px] items-start relative shrink-0"
                  data-node-id="178359:17944"
                >
                  <span
                    className="font-['Geist_Mono',monospace] font-normal text-[#767676] dark:text-[#a3a3a3] text-[12px] leading-[16px] tracking-[1.26px] uppercase whitespace-nowrap"
                    data-node-id="178359:17945"
                  >
                    coming soon
                  </span>
                  <h4
                    className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[18px] leading-[24px] w-[160px]"
                    data-node-id="178359:17946"
                  >
                    Script &amp; Prompt Parsing
                  </h4>
                </div>
                <div
                  className="hidden md:block h-[60px] relative shrink-0 w-0 dark:opacity-30 dark:invert"
                  data-node-id="178359:17947"
                >
                  <div className="absolute inset-[0_-0.5px]">
                    <img alt="" className="block max-w-none size-full" src={imgThespianVert60} />
                  </div>
                </div>
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] w-full md:w-[462px]"
                  data-node-id="178359:17948"
                >
                  Drop in a PDF script or creative brief, and the AI reads the dialogue to
                  generate a curated performer shortlist instantly.
                </p>
              </div>

              {/* Divider */}
              <div className="h-0 relative shrink-0 w-full dark:opacity-30 dark:invert" data-node-id="178359:17949">
                <div className="absolute inset-[-0.5px_0]">
                  <img alt="" className="block max-w-none size-full" src={imgThespianHoriz910} />
                </div>
              </div>

              {/* Bottom CTA Bar (178359:17950) */}
              <div
                className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] flex items-center justify-between px-[20px] py-[16px] relative rounded-[20px] shrink-0 w-full"
                data-node-id="178359:17950"
              >
                <p
                  className="font-['Inter_Tight',sans-serif] font-normal leading-[20px] text-[#1a1a1a] dark:text-[#f9f9f9] text-[14px] tracking-[0.42px]"
                  data-node-id="178359:17951"
                >
                  Start hiring today
                </p>
                <button
                  onClick={() => navigate(loggedInUser ? "/client" : "/auth?mode=signup&role=client")}
                  className="flex gap-[12px] h-[24px] items-center justify-end py-[4px] relative shrink-0 cursor-pointer group"
                  data-node-id="178359:17952"
                >
                  <span
                    className="font-['Inter_Tight',sans-serif] font-medium leading-[20px] text-[#f13030] text-[14px] tracking-[0.42px] whitespace-nowrap group-hover:underline"
                    data-node-id="178359:17953"
                  >
                    Get started for free
                  </span>
                  <div className="relative shrink-0 size-[16px]" data-node-id="178359:17954">
                    <img
                      alt=""
                      className="absolute block inset-0 max-w-none size-full"
                      src={imgIconArrowRightRed}
                    />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Divider (178359:17955) */}
          <div className="h-0 relative shrink-0 w-full max-w-[1040px]" data-node-id="178359:17955">
            <div className="absolute inset-[-0.5px_-22.69%]">
              <img alt="" className="block max-w-none size-full dark:opacity-30 dark:invert" src={imgThespianWideDivider} />
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 4: FAQ SECTION (178359:17958)
        ════════════════════════════════════════════════════════════════════════ */}
        <section
          className="bg-white dark:bg-[#000000] flex flex-col gap-[80px] items-center justify-center px-4 sm:px-8 xl:px-[200px] py-[80px] lg:py-[120px] relative w-full"
          data-node-id="178359:17958"
        >
          <div className="flex flex-col gap-[24px] items-center relative shrink-0">
            <h2 className="font-['Switzer',sans-serif] font-medium text-[#1a1a1a] dark:text-[#f9f9f9] text-[36px] sm:text-[48px] leading-[48px] tracking-[-1.44px] text-center">
              Frequently Asked Questions
            </h2>
            <p className="font-['Inter_Tight',sans-serif] font-normal text-[#767676] dark:text-[#a3a3a3] text-[16px] leading-[24px] text-center tracking-[0.48px] max-w-[372px]">
              Got questions about how payments, escrow, or Thespian AI work? Here are the
              answers.
            </p>
          </div>

          <div className="flex flex-col gap-[12px] items-center relative shrink-0 w-full max-w-[910px]">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#000000] border border-transparent dark:border-[#1a1a1a] flex flex-col py-[24px] px-[8px] relative rounded-[12px] shrink-0 w-full hover:bg-[#f9f9f9] dark:hover:bg-[#1a1a1a] transition-colors duration-150"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex gap-[24px] items-start justify-between text-left w-full cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex flex-[1_0_0] flex-col gap-[12px] items-start min-w-px relative">
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
                            alt={isOpen ? "Close" : "Expand"}
                            className="absolute block inset-0 max-w-none size-full dark:invert"
                            src={imgFaqPlus}
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

        {/* ════════════════════════════════════════════════════════════════════════
            SECTION 5: FOOTER (178359:17959)
        ════════════════════════════════════════════════════════════════════════ */}
        <WebsiteFooter />
      </main>
    </div>
  );
}
