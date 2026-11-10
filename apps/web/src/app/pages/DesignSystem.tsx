import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { FormField } from "../components/ui/FormField";
import { Modal } from "../components/ui/Modal";
import { useTheme } from "../Root";
import { DURATION_FAST, DURATION_MED, DURATION_SLOW, EASE_OUT, EASE_SPRING } from "../../lib/motionTokens";
import { ChevronLeft, Shield, Check, X, Copy, Sparkles, Layers, Sun, Moon } from "lucide-react";

type Role = "talent" | "client";

/** Checks perceived brightness (YIQ) for guaranteed WCAG AA text contrast */
function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 145;
}

/** Reads the live value of a CSS custom property off :root at render time */
function useCSSVar(name: string, scopeRef: React.RefObject<HTMLElement>) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const el = scopeRef.current ?? document.documentElement;
    setValue(getComputedStyle(el).getPropertyValue(name).trim());
  });
  return value;
}

function Swatch({ name, label, scopeRef }: { name: string; label?: string; scopeRef: React.RefObject<HTMLElement> }) {
  const value = useCSSVar(name, scopeRef);
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-11 h-11 rounded-[var(--radius-md)] shrink-0 shadow-sm"
        style={{ background: `var(${name})`, border: "1px solid var(--color-border-default)" }}
      />
      <div className="min-w-0">
        <div className="text-sm font-semibold font-body truncate" style={{ color: "var(--color-text-primary)" }}>{label ?? name}</div>
        <div className="text-xs font-mono truncate" style={{ color: "var(--color-text-tertiary)" }}>{name} · {value}</div>
      </div>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mb-14">
      <h2 className="font-display text-2xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>{title}</h2>
      {description && <p className="text-sm font-body mb-6 max-w-2xl" style={{ color: "var(--color-text-secondary)" }}>{description}</p>}
      {!description && <div className="mb-6" />}
      {children}
    </section>
  );
}

function Card({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`p-5 rounded-[var(--radius-lg)] ${className}`}
      style={{ background: "var(--color-bg-surface)", border: "1px solid var(--color-hairline)", boxShadow: "var(--shadow-card)", ...style }}
    >
      {children}
    </div>
  );
}

export function DesignSystem() {
  const navigate = useNavigate();
  const { isDark, toggle } = useTheme();
  const [role, setRole] = useState<Role>("talent");
  const [copiedGradient, setCopiedGradient] = useState<string | null>(null);
  const scopeRef = React.useRef<HTMLDivElement>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGradient(id);
    setTimeout(() => setCopiedGradient(null), 2000);
  };

  /* ── Core Brand Palettes ── */
  const BRAND_PALETTES = [
    {
      id: "purple",
      name: "Mono-purple",
      hex: "#7B00FE",
      rgb: "R 123, G 0, B 254",
      cmyk: "C 52%, M 100%, Y 0%, K 0%",
      tints: [
        { hex: "#7B00FE", step: "100%" },
        { hex: "#9B38FE", step: "80%" },
        { hex: "#BC6FFE", step: "60%" },
        { hex: "#DCA7FF", step: "40%" },
        { hex: "#F0DBFF", step: "20%" },
      ],
    },
    {
      id: "red",
      name: "Mono-red",
      hex: "#F13030",
      rgb: "R 241, G 48, B 48",
      cmyk: "C 0%, M 80%, Y 80%, K 5%",
      tints: [
        { hex: "#F13030", step: "100%" },
        { hex: "#F45959", step: "80%" },
        { hex: "#F78383", step: "60%" },
        { hex: "#FAADAD", step: "40%" },
        { hex: "#FDD6D6", step: "20%" },
      ],
    },
    {
      id: "green",
      name: "Mono-green",
      hex: "#00875A",
      rgb: "R 0, G 135, B 90",
      cmyk: "C 85%, M 20%, Y 85%, K 10%",
      tints: [
        { hex: "#004D25", step: "100%" },
        { hex: "#00875A", step: "80%" },
        { hex: "#33A67D", step: "60%" },
        { hex: "#66C4A1", step: "40%" },
        { hex: "#99E1C4", step: "20%" },
      ],
    },
    {
      id: "blue",
      name: "Mono-blue",
      hex: "#1E60FF",
      rgb: "R 30, G 96, B 255",
      cmyk: "C 85%, M 60%, Y 0%, K 0%",
      tints: [
        { hex: "#0052CC", step: "100%" },
        { hex: "#1E60FF", step: "80%" },
        { hex: "#4D85FF", step: "60%" },
        { hex: "#80AAFF", step: "40%" },
        { hex: "#B3D0FF", step: "20%" },
      ],
    },
    {
      id: "black",
      name: "Mono-black",
      hex: "#0D0D0F",
      rgb: "R 13, G 13, B 15",
      cmyk: "C 60%, M 50%, Y 50%, K 100%",
      tints: [
        { hex: "#000000", step: "100%" },
        { hex: "#16161A", step: "80%" },
        { hex: "#26262E", step: "60%" },
        { hex: "#40404A", step: "40%" },
        { hex: "#60606D", step: "20%" },
      ],
    },
    {
      id: "grey",
      name: "Mono-grey",
      hex: "#F5F5F0",
      rgb: "R 245, G 245, B 240",
      cmyk: "C 2%, M 2%, Y 4%, K 0%",
      tints: [
        { hex: "#F5F5F0", step: "100%" },
        { hex: "#E9E9E5", step: "80%" },
        { hex: "#D8D8D3", step: "60%" },
        { hex: "#C4C4BE", step: "40%" },
        { hex: "#AFAFA8", step: "20%" },
      ],
    },
  ];

  /* ── Light Mode UI Palette Swatches with Exact Hex Codes ── */
  const LIGHT_UI_PALETTE = [
    { name: "Primary Red", hex: "#FF3B30", token: "--color-red", rgb: "rgb(255, 59, 48)", text: "#FFFFFF", role: "Performer Actions & CTAs" },
    { name: "Secondary Purple", hex: "#7B00FE", token: "--color-purple", rgb: "rgb(123, 0, 254)", text: "#FFFFFF", role: "Client Actions & Briefs" },
    { name: "Success Green", hex: "#00875A", token: "--color-success", rgb: "rgb(0, 135, 90)", text: "#FFFFFF", role: "Escrow Locked & Verified" },
    { name: "Warning Gold", hex: "#FFB800", token: "--color-gold", rgb: "rgb(255, 184, 0)", text: "#000000", role: "Celebrity Tier & Alerts" },
    { name: "Info Blue", hex: "#1E60FF", token: "--color-blue", rgb: "rgb(30, 96, 255)", text: "#FFFFFF", role: "Analytics & Telemetry" },
    { name: "Navy Text", hex: "#16161A", token: "--color-text-primary", rgb: "rgb(22, 22, 26)", text: "#FFFFFF", role: "Primary Headings & Copy" },
    { name: "Gray Text", hex: "#5D5D66", token: "--color-text-secondary", rgb: "rgb(93, 93, 102)", text: "#FFFFFF", role: "Secondary Labels & Captions" },
    { name: "Border", hex: "#E9E9E5", token: "--color-hairline", rgb: "rgb(233, 233, 229)", text: "#000000", role: "Dividers & Card Outlines" },
    { name: "Background", hex: "#FFFFFF", token: "--color-bg-canvas", rgb: "rgb(255, 255, 255)", text: "#000000", role: "Clean Light Canvas" },
  ];

  /* ── Dark Mode UI Palette Swatches with Exact Hex Codes ── */
  const DARK_UI_PALETTE = [
    { name: "Primary Red", hex: "#FF4D4D", token: "--color-red", rgb: "rgb(255, 77, 77)", text: "#FFFFFF", role: "Electric Performer Accent" },
    { name: "Secondary Purple", hex: "#9B4DFF", token: "--color-purple", rgb: "rgb(155, 77, 255)", text: "#FFFFFF", role: "Electric Client Accent" },
    { name: "Success Green", hex: "#3EE089", token: "--color-success", rgb: "rgb(62, 224, 137)", text: "#000000", role: "100% Escrow Guarantee" },
    { name: "Warning Gold", hex: "#FFD268", token: "--color-gold", rgb: "rgb(255, 210, 104)", text: "#000000", role: "Celebrity Badge" },
    { name: "Info Blue", hex: "#3B82F6", token: "--color-blue", rgb: "rgb(59, 130, 246)", text: "#FFFFFF", role: "AI Indexing & Demos" },
    { name: "Dark Surface", hex: "#0D0D0F", token: "--color-bg-canvas", rgb: "rgb(13, 13, 15)", text: "#FFFFFF", role: "Obsidian Canvas Base" },
    { name: "Card Surface", hex: "#16161A", token: "--color-bg-surface", rgb: "rgb(22, 22, 26)", text: "#FFFFFF", role: "Elevated Bento Cards" },
    { name: "Border", hex: "#26262E", token: "--color-border-default", rgb: "rgb(38, 38, 46)", text: "#FFFFFF", role: "Hairline Card Borders" },
    { name: "Text", hex: "#F5F5F0", token: "--color-text-primary", rgb: "rgb(245, 245, 240)", text: "#000000", role: "High-Contrast Copy" },
  ];

  /* ── Official Light Theme Gradients (Pure Clean Edge-to-Edge) ── */
  const LIGHT_GRADIENTS = [
    {
      id: "light-red-purple",
      name: "Red → Purple",
      cssVar: "var(--gradient-red-purple)",
      rawCss: "linear-gradient(135deg, #FF3B30 0%, #7B00FE 100%)",
      from: "#FF3B30",
      to: "#7B00FE",
      usage: "Two-Sided Brand Signature & Master Bio Link",
    },
    {
      id: "light-purple-blue",
      name: "Purple → Blue",
      cssVar: "var(--gradient-purple-blue)",
      rawCss: "linear-gradient(135deg, #7B00FE 0%, #1E60FF 100%)",
      from: "#7B00FE",
      to: "#1E60FF",
      usage: "Monetization & Fan Micro-Deliverables",
    },
    {
      id: "light-green-gold",
      name: "Green → Gold",
      cssVar: "var(--gradient-green-gold)",
      rawCss: "linear-gradient(135deg, #00875A 0%, #FFB800 100%)",
      from: "#00875A",
      to: "#FFB800",
      usage: "Escrow Guarantee & Wallet Payouts",
    },
    {
      id: "light-red-gold",
      name: "Red → Gold",
      cssVar: "var(--gradient-red-gold)",
      rawCss: "linear-gradient(135deg, #FF3B30 0%, #FF9500 100%)",
      from: "#FF3B30",
      to: "#FF9500",
      usage: "Custom Rate Cards & Audition Packages",
    },
    {
      id: "light-blue-navy",
      name: "Blue → Navy",
      cssVar: "var(--gradient-blue-navy)",
      rawCss: "linear-gradient(135deg, #1E60FF 0%, #0D1B2A 100%)",
      from: "#1E60FF",
      to: "#0D1B2A",
      usage: "Visitor Intelligence & Conversion Radar",
    },
  ];

  /* ── Official Dark Theme Gradients (Pure Clean Edge-to-Edge) ── */
  const DARK_GRADIENTS = [
    {
      id: "dark-red-purple",
      name: "Red → Purple",
      cssVar: "var(--gradient-red-purple)",
      rawCss: "linear-gradient(135deg, #FF4D4D 0%, #9B4DFF 100%)",
      from: "#FF4D4D",
      to: "#9B4DFF",
      usage: "Luminous Avatar Halo & Primary CTA Glow",
    },
    {
      id: "dark-purple-blue",
      name: "Purple → Blue",
      cssVar: "var(--gradient-purple-blue)",
      rawCss: "linear-gradient(135deg, #9B4DFF 0%, #3B82F6 100%)",
      from: "#9B4DFF",
      to: "#3B82F6",
      usage: "Client Casting Briefs & Studio Invites",
    },
    {
      id: "dark-green-gold",
      name: "Green → Gold",
      cssVar: "var(--gradient-green-gold)",
      rawCss: "linear-gradient(135deg, #3EE089 0%, #FFD268 100%)",
      from: "#3EE089",
      to: "#FFD268",
      usage: "Verified Performer Shield & Escrow Locks",
    },
    {
      id: "dark-red-gold",
      name: "Red → Gold",
      cssVar: "var(--gradient-red-gold)",
      rawCss: "linear-gradient(135deg, #FF4D4D 0%, #FFAA00 100%)",
      from: "#FF4D4D",
      to: "#FFAA00",
      usage: "Rate Card Ribbons & Priority AI Search",
    },
    {
      id: "dark-blue-navy",
      name: "Blue → Navy",
      cssVar: "var(--gradient-blue-navy)",
      rawCss: "linear-gradient(135deg, #3B82F6 0%, #0D172A 100%)",
      from: "#3B82F6",
      to: "#0D172A",
      usage: "Dark Mode Analytics & Audio Stream Player",
    },
  ];

  return (
    <div ref={scopeRef} className={`role-${role} min-h-screen transition-colors duration-200`} style={{ background: "var(--color-bg-canvas)" }}>
      {/* ── Sticky Top Navigation Header ── */}
      <div className="sticky top-0 z-40 glass-panel" style={{ borderBottom: "1px solid var(--color-hairline)" }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              aria-label="Back"
              onClick={() => navigate("/")}
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity"
              style={{ background: "var(--color-bg-elevated)", color: "var(--color-text-secondary)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="font-display text-lg font-bold leading-tight truncate" style={{ color: "var(--color-text-primary)" }}>
                Monologg Design System &amp; Brand Token Guide
              </div>
              <div className="text-xs font-mono truncate" style={{ color: "var(--color-text-tertiary)" }}>
                src/styles/tokens.css · Complete Light &amp; Dark Hex Specifications
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex rounded-full p-0.5" style={{ background: "var(--color-bg-elevated)", border: "1px solid var(--color-border-default)" }}>
              {(["talent", "client"] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className="px-3 h-8 rounded-full text-xs font-semibold font-body capitalize transition-all"
                  style={{
                    background: role === r ? "var(--color-accent)" : "transparent",
                    color: role === r ? "var(--color-accent-on)" : "var(--color-text-secondary)",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
            <Button variant="secondary" className="h-8 px-3 text-xs flex items-center gap-1.5" onClick={toggle}>
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 py-10">
        <div className="p-6 sm:p-8 rounded-3xl mb-12 border shadow-sm" style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}>
          <div className="flex items-center gap-2 mb-2 font-mono text-xs font-bold uppercase text-[var(--color-accent)]">
            <Sparkles className="w-4 h-4" /> Living Design System Specification
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Monologg Color &amp; Gradient Matrix
          </h1>
          <p className="text-sm font-body max-w-3xl leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            High-contrast, accessible token architecture. Every color swatch renders its exact <strong>Hex Code</strong>, digital RGB, print CMYK, 5-step tint scale, and edge-to-edge gradient cards.
            Toggle <strong>Performer / Client</strong> in the header to preview role-based accent shifts, and <strong>Light / Dark</strong> to preview theme shifts.
          </p>
        </div>

        {/* ── 1. CORE BRAND IDENTITY PALETTE & TINT RAMPS ── */}
        <Section
          title="1. Core Brand Identity Palette (Pigments & Tints)"
          description="Monologg's foundational brand pigments with exact digital HEX, print CMYK, and 5-step stepped tint ramps with high-contrast text."
        >
          <div className="grid md:grid-cols-2 gap-4">
            {BRAND_PALETTES.map((pal) => (
              <div
                key={pal.id}
                className="p-5 rounded-2xl border flex flex-col justify-between shadow-sm"
                style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg font-body" style={{ color: "var(--color-text-primary)" }}>
                      {pal.name}
                    </h3>
                    <div className="font-mono text-sm font-bold" style={{ color: pal.hex }}>
                      {pal.hex}
                    </div>
                  </div>
                  <div className="text-right text-[11px] font-mono text-[var(--color-text-tertiary)] space-y-0.5">
                    <div>{pal.rgb}</div>
                    <div>{pal.cmyk}</div>
                  </div>
                </div>

                {/* Tint Step Bar with Dynamic Contrast */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono uppercase text-[var(--color-text-tertiary)]">
                    <span>5-Step Tint Ramp</span>
                    <span>100% → 20%</span>
                  </div>
                  <div className="grid grid-cols-5 h-14 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 shadow-inner">
                    {pal.tints.map((tint, i) => {
                      const textColor = isDarkColor(tint.hex) ? "#FFFFFF" : "#000000";
                      return (
                        <div
                          key={i}
                          className="w-full h-full flex flex-col justify-end p-1.5 transition-transform hover:scale-105"
                          style={{ background: tint.hex }}
                          title={`${tint.hex} (${tint.step})`}
                        >
                          <span
                            className="text-[9px] font-mono font-bold leading-tight drop-shadow-sm"
                            style={{ color: textColor }}
                          >
                            {tint.hex}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 2. LIGHT MODE COMPLETE UI PALETTE & HEX CODES ── */}
        <Section
          title="2. Light Mode UI Palette (Exact Hex Codes)"
          description="Every official color used across Light Mode surfaces with exact Hex, RGB, token name, and semantic purpose."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {LIGHT_UI_PALETTE.map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm transition-all hover:shadow-md"
                style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl shrink-0 border border-black/10 flex items-center justify-center font-bold text-xs shadow-sm"
                  style={{ background: item.hex, color: item.text }}
                >
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{item.name}</div>
                  <div className="text-xs font-mono font-bold text-[#F13030] dark:text-[#FF4D4D]">{item.hex}</div>
                  <div className="text-[10px] font-mono truncate" style={{ color: "var(--color-text-tertiary)" }}>{item.token}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--color-text-secondary)" }}>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 3. LIGHT THEME GRADIENTS WITH CLEAN EDGE-TO-EDGE SWATCHES ── */}
        <Section
          title="3. Light Theme Gradients (Formulas &amp; Hex Stops)"
          description="Pure, vibrant edge-to-edge gradient cards for Light Mode. Click any card to copy its exact CSS formula."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {LIGHT_GRADIENTS.map((g) => (
              <div
                key={g.id}
                onClick={() => copyToClipboard(g.rawCss, g.id)}
                className="group relative p-6 rounded-3xl flex flex-col justify-between h-48 cursor-pointer transition-all hover:scale-[1.02] active:scale-98 shadow-md border border-black/10"
                style={{ background: g.rawCss }}
              >
                <div className="flex justify-between items-start">
                  <div className="text-4xl font-display font-black text-white drop-shadow-md">Aa</div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors">
                    {copiedGradient === g.id ? "Copied CSS!" : "Copy CSS"}
                  </span>
                </div>

                <div className="space-y-0.5 text-white drop-shadow-md">
                  <div className="text-sm font-bold leading-tight">{g.name}</div>
                  <div className="text-xs font-mono font-black text-white/95">
                    {g.from} → {g.to}
                  </div>
                  <div className="text-[10px] text-white/80 font-medium truncate">{g.usage}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 4. DARK MODE COMPLETE UI PALETTE & HEX CODES ── */}
        <Section
          title="4. Dark Mode UI Palette (Exact Hex Codes)"
          description="Electric and obsidian colors engineered for Dark Mode depth and WCAG AA contrast compliance."
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {DARK_UI_PALETTE.map((item) => (
              <div
                key={item.name}
                className="p-4 rounded-2xl border flex items-center gap-3.5 shadow-sm transition-all hover:shadow-md"
                style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-hairline)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl shrink-0 border border-white/20 flex items-center justify-center font-bold text-xs shadow-md"
                  style={{ background: item.hex, color: item.text }}
                >
                  ✓
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate" style={{ color: "var(--color-text-primary)" }}>{item.name}</div>
                  <div className="text-xs font-mono font-bold text-[#FF4D4D]">{item.hex}</div>
                  <div className="text-[10px] font-mono truncate" style={{ color: "var(--color-text-tertiary)" }}>{item.token}</div>
                  <div className="text-[10px] truncate" style={{ color: "var(--color-text-secondary)" }}>{item.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 5. DARK THEME GRADIENTS WITH CLEAN EDGE-TO-EDGE SWATCHES ── */}
        <Section
          title="5. Dark Theme Gradients (Formulas &amp; Hex Stops)"
          description="Pure, electric edge-to-edge gradient cards for Dark Mode. Click any card to copy its exact CSS formula."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DARK_GRADIENTS.map((g) => (
              <div
                key={g.id}
                onClick={() => copyToClipboard(g.rawCss, g.id)}
                className="group relative p-6 rounded-3xl flex flex-col justify-between h-48 cursor-pointer transition-all hover:scale-[1.02] active:scale-98 shadow-xl border border-white/10"
                style={{ background: g.rawCss }}
              >
                <div className="flex justify-between items-start">
                  <div className="text-4xl font-display font-black text-white drop-shadow-lg">Aa</div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors border border-white/10">
                    {copiedGradient === g.id ? "Copied CSS!" : "Copy CSS"}
                  </span>
                </div>

                <div className="space-y-0.5 text-white drop-shadow-md">
                  <div className="text-sm font-bold leading-tight">{g.name}</div>
                  <div className="text-xs font-mono font-black text-white/95">
                    {g.from} → {g.to}
                  </div>
                  <div className="text-[10px] text-white/80 font-medium truncate">{g.usage}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 6. LIVE RUNTIME COMPUTED CSS CUSTOM PROPERTIES ── */}
        <Section
          title="6. Live Computed CSS Variables (tokens.css)"
          description="Active custom properties computed at runtime by the browser engine from tokens.css."
        >
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-6">
            <Swatch name="--color-bg-canvas" label="Canvas" scopeRef={scopeRef} />
            <Swatch name="--color-bg-surface" label="Surface" scopeRef={scopeRef} />
            <Swatch name="--color-bg-elevated" label="Elevated" scopeRef={scopeRef} />
            <Swatch name="--color-hairline" label="Hairline" scopeRef={scopeRef} />
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-6">
            <Swatch name="--color-accent" label="Accent (role-adaptive)" scopeRef={scopeRef} />
            <Swatch name="--color-accent-press" label="Accent · press" scopeRef={scopeRef} />
            <Swatch name="--color-accent-soft" label="Accent · soft" scopeRef={scopeRef} />
            <Swatch name="--color-accent-glow" label="Accent · glow" scopeRef={scopeRef} />
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 mb-6">
            <Swatch name="--color-text-primary" label="Text · primary" scopeRef={scopeRef} />
            <Swatch name="--color-text-secondary" label="Text · secondary" scopeRef={scopeRef} />
            <Swatch name="--color-text-tertiary" label="Text · tertiary" scopeRef={scopeRef} />
            <Swatch name="--color-border-default" label="Border · default" scopeRef={scopeRef} />
          </div>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            <Swatch name="--color-success" label="Success" scopeRef={scopeRef} />
            <Swatch name="--color-warning" label="Warning" scopeRef={scopeRef} />
            <Swatch name="--color-error" label="Error" scopeRef={scopeRef} />
            <Swatch name="--color-overlay" label="Modal overlay" scopeRef={scopeRef} />
          </div>
        </Section>

        {/* ── 7. UI COMPONENTS & BUTTONS ── */}
        <Section title="7. UI Components" description="Interactive components rendered straight from src/app/components/ui.">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider mb-3 font-body" style={{ color: "var(--color-text-tertiary)" }}>
                Monologg Brand Buttons
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="red">Mono-Red (Performer)</Button>
                <Button variant="purple">Mono-Purple (Client)</Button>
                <Button variant="dark-pill">Dark Neutral Pill</Button>
                <Button variant="outline-pill">Outline Pill</Button>
                <Button variant="primary">Primary Adaptive</Button>
                <Button variant="secondary">Secondary Neutral</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="icon"><Check className="w-4 h-4" /></Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-wider mb-3 font-body" style={{ color: "var(--color-text-tertiary)" }}>
                Status Badges &amp; Avatars
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge tone="success"><Shield className="w-3 h-3" /> Verified Performer</Badge>
                <Badge tone="warning">Celebrity Tier</Badge>
                <Badge tone="accent">Thespian AI Indexed</Badge>
                <Badge tone="neutral">Dramatic Actor</Badge>
                <Avatar size="md" background="#F13030" color="#FFFFFF">EO</Avatar>
                <Avatar size="md" background="#7B00FE" color="#FFFFFF">MK</Avatar>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
