// Monologg — Screen & Component Generator (Figma Plugin)
// 100% Native Figma Plugin API with safe font loading, exact Frame 11 parity, and design tokens

figma.showUI(__html__, { width: 440, height: 490, title: "Monologg Screen Generator" });

// ── Color Utilities ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function solidPaint(hex, opacity = 1) {
  return [{ type: "SOLID", color: hexToRgb(hex), opacity }];
}

// ── Font Loading with Multi-Tier Fallback ─────────────────────────────────────
async function loadFontSafe(family, style) {
  const candidates = [
    { family, style },
    { family: "Switzer", style: style === "Bold" ? "Bold" : style === "Medium" ? "Medium" : "Regular" },
    { family: "Inter", style: style === "Bold" ? "Bold" : style === "Medium" ? "Medium" : "Regular" },
    { family: "Roboto", style: "Regular" },
  ];

  for (const font of candidates) {
    try {
      await figma.loadFontAsync(font);
      return font;
    } catch (_) {}
  }
  return { family: "Inter", style: "Regular" };
}

// ── Node Creation Helpers ───────────────────────────────────────────────────
function createAutoFrame(name, layoutMode, spacing, padding, bgHex, radius = 0) {
  const frame = figma.createFrame();
  frame.name = name;
  frame.layoutMode = layoutMode; // 'HORIZONTAL' | 'VERTICAL'
  frame.itemSpacing = spacing;
  frame.paddingTop = padding;
  frame.paddingBottom = padding;
  frame.paddingLeft = padding;
  frame.paddingRight = padding;
  if (bgHex) {
    frame.fills = solidPaint(bgHex);
  } else {
    frame.fills = [];
  }
  frame.cornerRadius = radius;
  return frame;
}

function createTextNode(text, font, size, colorHex, autoResize = "WIDTH_AND_HEIGHT") {
  const node = figma.createText();
  node.fontName = font;
  node.fontSize = size;
  node.characters = text;
  node.fills = solidPaint(colorHex);
  node.textAutoResize = autoResize;
  return node;
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATOR 1: DESIGN TOKENS BLOCK
// ══════════════════════════════════════════════════════════════════════════════
async function generateTokensBlock(container, fontMed, fontReg) {
  const section = createAutoFrame("Tokens / Monologg Design System", "VERTICAL", 16, 24, "#16161A", 16);
  section.strokes = solidPaint("#262626");
  section.strokeWeight = 1;
  section.layoutSizingHorizontal = "FIXED";
  section.resize(400, 360);

  const header = createTextNode("MONOLOGG DESIGN TOKENS", fontMed, 14, "#F13030");
  section.appendChild(header);

  const desc = createTextNode("Official leye/Grey alpha spectrum & brand identity", fontReg, 12, "#A3A3A3");
  section.appendChild(desc);

  const tokens = [
    { name: "Canvas Dark", hex: "#000000", desc: "Root page canvas in dark mode" },
    { name: "Card Active (Frame 11)", hex: "#0E0E0E", desc: "Selected showcase step card" },
    { name: "Surface / Hairline", hex: "#1A1A1A", desc: "Container surfaces & subtle borders" },
    { name: "Active Border / Pill", hex: "#333333", desc: "Elevated tabs & switches" },
    { name: "Brand Performer Red", hex: "#F13030", desc: "Primary CTA & interactive state" },
    { name: "Brand Client Purple", hex: "#7B00FE", desc: "Client role accent" },
    { name: "Escrow Secure Green", hex: "#1A7544", desc: "Verified badge & completed escrow" },
  ];

  const grid = createAutoFrame("Token Grid", "VERTICAL", 8, 0, null);
  grid.layoutSizingHorizontal = "FILL";

  for (const t of tokens) {
    const row = createAutoFrame(`Token: ${t.name}`, "HORIZONTAL", 12, 6, "#0E0E0E", 6);
    row.layoutSizingHorizontal = "FILL";

    const swatch = figma.createRectangle();
    swatch.resize(20, 20);
    swatch.cornerRadius = 4;
    swatch.fills = solidPaint(t.hex);
    swatch.strokes = solidPaint("#333333");
    swatch.strokeWeight = 1;
    row.appendChild(swatch);

    const label = createTextNode(`${t.name}  (${t.hex})`, fontMed, 11, "#F5F5F5");
    row.appendChild(label);

    grid.appendChild(row);
  }

  section.appendChild(grid);
  container.appendChild(section);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATOR 2: PRODUCT PAGE 7-STEP SHOWCASE (FRAME 11 PARITY)
// ══════════════════════════════════════════════════════════════════════════════
async function generateProductShowcase(container, fontBold, fontMed, fontReg) {
  const section = createAutoFrame("Screen / Product Page 7-Step Showcase", "VERTICAL", 48, 48, "#000000", 24);
  section.strokes = solidPaint("#1A1A1A");
  section.strokeWeight = 1;
  section.layoutSizingHorizontal = "FIXED";
  section.resize(1140, 780);

  // Header Group
  const headerCol = createAutoFrame("Header", "VERTICAL", 12, 0, null);
  headerCol.layoutSizingHorizontal = "FILL";

  const tag = createTextNode("• FAANG-GRADE PLATFORM WORKFLOW", fontMed, 12, "#F13030");
  headerCol.appendChild(tag);

  const title = createTextNode("Build your personal\ndigital stage", fontBold, 44, "#F9F9F9");
  headerCol.appendChild(title);

  const sub = createTextNode(
    "Ditch scattered bio links and fragmented gig bookings. Monologg gives performing artists an all-in-one verified storefront with guaranteed escrow protection.",
    fontReg,
    16,
    "#A3A3A3"
  );
  sub.layoutSizingHorizontal = "FIXED";
  sub.resize(720, 48);
  headerCol.appendChild(sub);

  section.appendChild(headerCol);

  // Two-Column Showcase (Left: Cards | Right: Phone Stage)
  const columnsRow = createAutoFrame("Showcase Body", "HORIZONTAL", 32, 0, null);
  columnsRow.layoutSizingHorizontal = "FILL";

  // Left Column (5 Cards in 560px window)
  const leftCol = createAutoFrame("Step Window (560px Locked)", "VERTICAL", 12, 0, null);
  leftCol.layoutSizingHorizontal = "FIXED";
  leftCol.resize(491, 560);

  // Card 01: ACTIVE CARD (Figma Frame 11 Parity)
  const card1 = createAutoFrame("Card 01 - Active (Frame 11)", "HORIZONTAL", 24, 24, "#0E0E0E", 12);
  card1.layoutSizingHorizontal = "FILL";
  // Borderless: exact Frame 11 code
  card1.strokes = [];

  // Icon Circle
  const iconBg = createAutoFrame("ArrowCircleRight", "HORIZONTAL", 0, 0, "#FFFFFF", 12);
  iconBg.resize(24, 24);
  iconBg.primaryAxisAlignItems = "CENTER";
  iconBg.counterAxisAlignItems = "CENTER";
  const arrowTxt = createTextNode("→", fontBold, 14, "#0E0E0E");
  iconBg.appendChild(arrowTxt);
  card1.appendChild(iconBg);

  // Content Frame (Frame 2147228254)
  const c1Text = createAutoFrame("Content", "VERTICAL", 8, 0, null);
  c1Text.layoutSizingHorizontal = "FILL";
  const c1Title = createTextNode("Sleek Bio Storefront", fontMed, 18, "#F5F5F5");
  c1Text.appendChild(c1Title);
  const c1Desc = createTextNode(
    "Ditch scattered bio links for a mobile storefront that showcases your video monologues, audio reels, reach metrics, and verified reviews all in one place.",
    fontReg,
    15,
    "#A3A3A3"
  );
  c1Desc.layoutSizingHorizontal = "FILL";
  c1Text.appendChild(c1Desc);
  card1.appendChild(c1Text);
  leftCol.appendChild(card1);

  // Card 02: Completed
  const card2 = createAutoFrame("Card 02 - Completed", "HORIZONTAL", 24, 20, "#000000", 12);
  card2.layoutSizingHorizontal = "FILL";
  card2.strokes = solidPaint("#1A1A1A");
  card2.strokeWeight = 1;
  const num2 = createTextNode("02", fontMed, 18, "#F8F8F8");
  card2.appendChild(num2);
  const c2Title = createTextNode("Custom Rate Cards & Micro-Deliverables", fontMed, 16, "#F5F5F5");
  card2.appendChild(c2Title);
  leftCol.appendChild(card2);

  // Card 03: Default
  const card3 = createAutoFrame("Card 03 - Default", "HORIZONTAL", 24, 20, "#000000", 12);
  card3.layoutSizingHorizontal = "FILL";
  card3.strokes = solidPaint("#1A1A1A");
  card3.strokeWeight = 1;
  const num3 = createTextNode("03", fontMed, 18, "#BABABA");
  card3.appendChild(num3);
  const c3Title = createTextNode("Real-Time Analytics & Intelligence", fontMed, 16, "#BABABA");
  card3.appendChild(c3Title);
  leftCol.appendChild(card3);

  // Card 04: Default
  const card4 = createAutoFrame("Card 04 - Default", "HORIZONTAL", 24, 20, "#000000", 12);
  card4.layoutSizingHorizontal = "FILL";
  card4.strokes = solidPaint("#1A1A1A");
  card4.strokeWeight = 1;
  const num4 = createTextNode("04", fontMed, 18, "#BABABA");
  card4.appendChild(num4);
  const c4Title = createTextNode("Escrow Security & Guaranteed Milestones", fontMed, 16, "#BABABA");
  card4.appendChild(c4Title);
  leftCol.appendChild(card4);

  // Card 05: Default
  const card5 = createAutoFrame("Card 05 - Default", "HORIZONTAL", 24, 20, "#000000", 12);
  card5.layoutSizingHorizontal = "FILL";
  card5.strokes = solidPaint("#1A1A1A");
  card5.strokeWeight = 1;
  const num5 = createTextNode("05", fontMed, 18, "#BABABA");
  card5.appendChild(num5);
  const c5Title = createTextNode("Direct Proposal Bidding & Agency Booking", fontMed, 16, "#BABABA");
  card5.appendChild(c5Title);
  leftCol.appendChild(card5);

  columnsRow.appendChild(leftCol);

  // Right Stage (525px width, 484px height)
  const rightStage = createAutoFrame("Stage Preview Container", "VERTICAL", 20, 32, "#1A1A1A", 20);
  rightStage.layoutSizingHorizontal = "FIXED";
  rightStage.resize(525, 484);
  rightStage.primaryAxisAlignItems = "CENTER";
  rightStage.counterAxisAlignItems = "CENTER";

  // Mockup inside stage
  const phoneFrame = createAutoFrame("Phone Mockup", "VERTICAL", 16, 20, "#0E0E0E", 28);
  phoneFrame.resize(300, 420);
  phoneFrame.strokes = solidPaint("#333333");
  phoneFrame.strokeWeight = 1;

  const phoneBar = createAutoFrame("Notch Bar", "HORIZONTAL", 0, 0, "#1A1A1A", 4);
  phoneBar.resize(90, 6);
  phoneFrame.appendChild(phoneBar);

  const phoneProfile = createAutoFrame("Performer Banner", "VERTICAL", 8, 0, null);
  phoneProfile.layoutSizingHorizontal = "FILL";
  const avatarDot = figma.createEllipse();
  avatarDot.resize(44, 44);
  avatarDot.fills = solidPaint("#F13030");
  phoneProfile.appendChild(avatarDot);
  const pName = createTextNode("Tade Adebayo", fontBold, 15, "#F9F9F9");
  phoneProfile.appendChild(pName);
  const pBadge = createTextNode("Verified Thespian · 4.9 ★", fontReg, 11, "#A3A3A3");
  phoneProfile.appendChild(pBadge);
  phoneFrame.appendChild(phoneProfile);

  const mockVideo = createAutoFrame("Video Reel Player", "VERTICAL", 0, 0, "#1A1A1A", 12);
  mockVideo.resize(260, 130);
  mockVideo.primaryAxisAlignItems = "CENTER";
  mockVideo.counterAxisAlignItems = "CENTER";
  const playBtn = createTextNode("▶ PLAY REEL", fontMed, 12, "#F13030");
  mockVideo.appendChild(playBtn);
  phoneFrame.appendChild(mockVideo);

  const bookBtn = createAutoFrame("Book Button", "HORIZONTAL", 0, 8, "#F13030", 18);
  bookBtn.layoutSizingHorizontal = "FILL";
  bookBtn.primaryAxisAlignItems = "CENTER";
  const bTxt = createTextNode("Book via Monologg Escrow", fontBold, 12, "#FFFFFF");
  bookBtn.appendChild(bTxt);
  phoneFrame.appendChild(bookBtn);

  rightStage.appendChild(phoneFrame);
  columnsRow.appendChild(rightStage);

  section.appendChild(columnsRow);
  container.appendChild(section);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATOR 3: PERFORMER BIO STOREFRONT (MOBILE 390px)
// ══════════════════════════════════════════════════════════════════════════════
async function generateStorefrontMobile(container, fontBold, fontMed, fontReg) {
  const phone = createAutoFrame("Screen / Performer Bio Storefront (Mobile)", "VERTICAL", 20, 24, "#000000", 36);
  phone.strokes = solidPaint("#333333");
  phone.strokeWeight = 1.5;
  phone.layoutSizingHorizontal = "FIXED";
  phone.resize(390, 844);

  // Top App Bar
  const topNav = createAutoFrame("Top Bar", "HORIZONTAL", 0, 0, null);
  topNav.layoutSizingHorizontal = "FILL";
  topNav.primaryAxisAlignItems = "SPACE_BETWEEN";
  topNav.counterAxisAlignItems = "CENTER";
  const brand = createTextNode("MONOLOGG", fontBold, 14, "#F13030");
  topNav.appendChild(brand);
  const sharePill = createTextNode("Share Storefront ↗", fontMed, 11, "#A3A3A3");
  topNav.appendChild(sharePill);
  phone.appendChild(topNav);

  // Avatar & Identity
  const identity = createAutoFrame("Profile Header", "VERTICAL", 10, 0, null);
  identity.layoutSizingHorizontal = "FILL";

  const avatar = figma.createEllipse();
  avatar.resize(72, 72);
  avatar.fills = solidPaint("#1A1A1A");
  avatar.strokes = solidPaint("#F13030");
  avatar.strokeWeight = 2;
  identity.appendChild(avatar);

  const nameRow = createAutoFrame("Name & Badge", "HORIZONTAL", 8, 0, null);
  nameRow.counterAxisAlignItems = "CENTER";
  const nameTxt = createTextNode("Tade Adebayo", fontBold, 22, "#F9F9F9");
  nameRow.appendChild(nameTxt);
  const vBadge = createTextNode("VERIFIED", fontBold, 9, "#1A7544");
  nameRow.appendChild(vBadge);
  identity.appendChild(nameRow);

  const roleTxt = createTextNode("Lead Thespian · Voice Artist · Nollywood", fontMed, 13, "#A3A3A3");
  identity.appendChild(roleTxt);

  const bioTxt = createTextNode(
    "Classical stage actor, audio drama lead, and commercial voice talent. Represented for film, voice-over, and corporate event hosting in Lagos & London.",
    fontReg,
    13,
    "#BABABA"
  );
  bioTxt.layoutSizingHorizontal = "FILL";
  identity.appendChild(bioTxt);
  phone.appendChild(identity);

  // Stats Bar (Reach / On-Time / Escrow)
  const statsBar = createAutoFrame("Stats Bar", "HORIZONTAL", 12, 14, "#16161A", 12);
  statsBar.layoutSizingHorizontal = "FILL";
  statsBar.strokes = solidPaint("#262626");
  statsBar.strokeWeight = 1;
  statsBar.primaryAxisAlignItems = "SPACE_BETWEEN";

  const s1 = createAutoFrame("Stat 1", "VERTICAL", 2, 0, null);
  s1.appendChild(createTextNode("14.2K", fontBold, 15, "#F9F9F9"));
  s1.appendChild(createTextNode("Monthly Reach", fontReg, 10, "#A3A3A3"));
  statsBar.appendChild(s1);

  const s2 = createAutoFrame("Stat 2", "VERTICAL", 2, 0, null);
  s2.appendChild(createTextNode("98.4%", fontBold, 15, "#F9F9F9"));
  s2.appendChild(createTextNode("On-Time Rate", fontReg, 10, "#A3A3A3"));
  statsBar.appendChild(s2);

  const s3 = createAutoFrame("Stat 3", "VERTICAL", 2, 0, null);
  s3.appendChild(createTextNode("₦2.5M+", fontBold, 15, "#1A7544"));
  s3.appendChild(createTextNode("Secured Escrow", fontReg, 10, "#A3A3A3"));
  statsBar.appendChild(s3);
  phone.appendChild(statsBar);

  // Rate Cards Section
  const ratesSection = createAutoFrame("Rate Cards", "VERTICAL", 10, 0, null);
  ratesSection.layoutSizingHorizontal = "FILL";
  const rHeader = createTextNode("Book Rate Cards", fontMed, 14, "#F5F5F5");
  ratesSection.appendChild(rHeader);

  const cards = [
    { title: "Monologue Feature (60s)", price: "₦150,000", tag: "Most Popular" },
    { title: "Commercial Voice-Over (30s)", price: "₦85,000", tag: "3-Day Delivery" },
    { title: "Corporate Event Host", price: "₦300,000", tag: "Half-Day" },
  ];

  for (const c of cards) {
    const card = createAutoFrame("Rate Card", "HORIZONTAL", 12, 14, "#16161A", 10);
    card.layoutSizingHorizontal = "FILL";
    card.strokes = solidPaint("#262626");
    card.strokeWeight = 1;
    card.primaryAxisAlignItems = "SPACE_BETWEEN";
    card.counterAxisAlignItems = "CENTER";

    const left = createAutoFrame("Info", "VERTICAL", 4, 0, null);
    left.appendChild(createTextNode(c.title, fontMed, 13, "#F5F5F5"));
    left.appendChild(createTextNode(c.tag, fontReg, 10, "#F13030"));
    card.appendChild(left);

    const price = createTextNode(c.price, fontBold, 14, "#F9F9F9");
    card.appendChild(price);
    ratesSection.appendChild(card);
  }
  phone.appendChild(ratesSection);

  // Bottom Fixed CTA
  const bottomBar = createAutoFrame("Sticky CTA Bar", "HORIZONTAL", 0, 14, "#F13030", 22);
  bottomBar.layoutSizingHorizontal = "FILL";
  bottomBar.primaryAxisAlignItems = "CENTER";
  const btnTxt = createTextNode("Instant Book via Escrow", fontBold, 13, "#FFFFFF");
  bottomBar.appendChild(btnTxt);
  phone.appendChild(bottomBar);

  container.appendChild(phone);
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERATOR 4: ORDER ROOM & ESCROW MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
async function generateOrderRoom(container, fontBold, fontMed, fontReg) {
  const section = createAutoFrame("Screen / Order Room & Escrow Workspace", "VERTICAL", 28, 36, "#000000", 20);
  section.strokes = solidPaint("#1A1A1A");
  section.strokeWeight = 1;
  section.layoutSizingHorizontal = "FIXED";
  section.resize(980, 560);

  // Header Title
  const header = createAutoFrame("Order Header", "VERTICAL", 6, 0, null);
  header.layoutSizingHorizontal = "FILL";
  const orderId = createTextNode("ORDER #MNL-8821 · PAYSTACK ESCROW SECURED", fontMed, 11, "#1A7544");
  header.appendChild(orderId);
  const title = createTextNode("Commercial Voiceover: 30s Brand Anthem", fontBold, 24, "#F9F9F9");
  header.appendChild(title);
  section.appendChild(header);

  // Stepper Tracker
  const stepper = createAutoFrame("Milestone Stepper", "HORIZONTAL", 16, 16, "#16161A", 12);
  stepper.layoutSizingHorizontal = "FILL";
  stepper.strokes = solidPaint("#262626");
  stepper.strokeWeight = 1;
  stepper.primaryAxisAlignItems = "SPACE_BETWEEN";

  const steps = [
    { name: "1. Brief Agreed", status: "✓ Done", color: "#1A7544" },
    { name: "2. Escrow Funded", status: "✓ ₦85,000", color: "#1A7544" },
    { name: "3. Deliverable Review", status: "● In Review", color: "#F13030" },
    { name: "4. Payout Released", status: "○ Pending", color: "#767676" },
  ];

  for (const s of steps) {
    const stCol = createAutoFrame("Step", "VERTICAL", 2, 0, null);
    stCol.appendChild(createTextNode(s.name, fontMed, 12, "#F5F5F5"));
    stCol.appendChild(createTextNode(s.status, fontBold, 11, s.color));
    stepper.appendChild(stCol);
  }
  section.appendChild(stepper);

  // Split View: Player vs Financial Summary
  const bodyRow = createAutoFrame("Order Content", "HORIZONTAL", 24, 0, null);
  bodyRow.layoutSizingHorizontal = "FILL";

  // Left Player Box
  const player = createAutoFrame("Deliverable Player", "VERTICAL", 16, 24, "#16161A", 12);
  player.layoutSizingHorizontal = "FILL";
  player.strokes = solidPaint("#262626");
  player.strokeWeight = 1;
  player.primaryAxisAlignItems = "CENTER";
  player.counterAxisAlignItems = "CENTER";
  player.appendChild(createTextNode("AUDIO DELIVERABLE: TAKES_01_FINAL.WAV", fontMed, 12, "#A3A3A3"));
  player.appendChild(createTextNode("▶ 00:00 / 00:30 (48kHz 24-bit)", fontBold, 16, "#F5F5F5"));
  player.appendChild(createTextNode("Watermark Protected until Escrow Release", fontReg, 11, "#767676"));
  bodyRow.appendChild(player);

  // Right Escrow Card
  const escrowCard = createAutoFrame("Escrow Financials", "VERTICAL", 12, 20, "#16161A", 12);
  escrowCard.layoutSizingHorizontal = "FIXED";
  escrowCard.resize(360, 220);
  escrowCard.strokes = solidPaint("#262626");
  escrowCard.strokeWeight = 1;

  escrowCard.appendChild(createTextNode("ESCROW BREAKDOWN", fontMed, 11, "#A3A3A3"));

  const line1 = createAutoFrame("Line 1", "HORIZONTAL", 0, 0, null);
  line1.layoutSizingHorizontal = "FILL";
  line1.primaryAxisAlignItems = "SPACE_BETWEEN";
  line1.appendChild(createTextNode("Performer Agreed Rate", fontReg, 13, "#F5F5F5"));
  line1.appendChild(createTextNode("₦85,000.00", fontMed, 13, "#F9F9F9"));
  escrowCard.appendChild(line1);

  const line2 = createAutoFrame("Line 2", "HORIZONTAL", 0, 0, null);
  line2.layoutSizingHorizontal = "FILL";
  line2.primaryAxisAlignItems = "SPACE_BETWEEN";
  line2.appendChild(createTextNode("Monologg Platform Fee (7%)", fontReg, 13, "#A3A3A3"));
  line2.appendChild(createTextNode("-₦5,950.00", fontReg, 13, "#F13030"));
  escrowCard.appendChild(line2);

  const divider = figma.createRectangle();
  divider.resize(320, 1);
  divider.fills = solidPaint("#262626");
  escrowCard.appendChild(divider);

  const line3 = createAutoFrame("Line 3", "HORIZONTAL", 0, 0, null);
  line3.layoutSizingHorizontal = "FILL";
  line3.primaryAxisAlignItems = "SPACE_BETWEEN";
  line3.appendChild(createTextNode("Net Payout Release", fontBold, 14, "#1A7544"));
  line3.appendChild(createTextNode("₦79,050.00", fontBold, 14, "#1A7544"));
  escrowCard.appendChild(line3);

  const releaseBtn = createAutoFrame("Release Button", "HORIZONTAL", 0, 10, "#F13030", 18);
  releaseBtn.layoutSizingHorizontal = "FILL";
  releaseBtn.primaryAxisAlignItems = "CENTER";
  releaseBtn.appendChild(createTextNode("Approve & Release Payment", fontBold, 12, "#FFFFFF"));
  escrowCard.appendChild(releaseBtn);

  bodyRow.appendChild(escrowCard);
  section.appendChild(bodyRow);
  container.appendChild(section);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN ENTRYPOINT & UI MESSAGE DISPATCHER
// ══════════════════════════════════════════════════════════════════════════════
figma.ui.onmessage = async (msg) => {
  if (msg.type !== "generate-screens") return;

  const { options } = msg;

  try {
    figma.ui.postMessage({ type: "progress", message: "Loading typography..." });

    const fontBold = await loadFontSafe("Switzer", "Bold");
    const fontMed = await loadFontSafe("Switzer", "Medium");
    const fontReg = await loadFontSafe("Inter Tight", "Regular");

    let targetPage = figma.currentPage;

    if (options.newPage) {
      figma.ui.postMessage({ type: "progress", message: "Creating 'Web App — Live Screens' page..." });
      const newPage = figma.createPage();
      newPage.name = "Web App — Live Screens";
      await figma.setCurrentPageAsync(newPage);
      targetPage = newPage;
    }

    // Master Canvas Layout Container
    const canvasWrap = createAutoFrame("Monologg Live Screens Hub", "VERTICAL", 64, 48, null);
    targetPage.appendChild(canvasWrap);

    let count = 0;

    if (options.tokens) {
      figma.ui.postMessage({ type: "progress", message: "Drawing Design Tokens..." });
      await generateTokensBlock(canvasWrap, fontMed, fontReg);
      count++;
    }

    if (options.product) {
      figma.ui.postMessage({ type: "progress", message: "Building Product Page 7-Step Showcase..." });
      await generateProductShowcase(canvasWrap, fontBold, fontMed, fontReg);
      count++;
    }

    if (options.storefront) {
      figma.ui.postMessage({ type: "progress", message: "Generating Mobile Bio Storefront (390px)..." });
      await generateStorefrontMobile(canvasWrap, fontBold, fontMed, fontReg);
      count++;
    }

    if (options.orderRoom) {
      figma.ui.postMessage({ type: "progress", message: "Generating Order Room & Escrow Workspace..." });
      await generateOrderRoom(canvasWrap, fontBold, fontMed, fontReg);
      count++;
    }

    // Zoom to fit generated artboards
    figma.viewport.scrollAndZoomIntoView([canvasWrap]);

    figma.ui.postMessage({ type: "done", count });
  } catch (err) {
    figma.ui.postMessage({ type: "error", message: err.message || String(err) });
  }
};

