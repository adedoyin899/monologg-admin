# MONOLOGG - COMPLETE UX ARCHITECTURE & DESIGN SPECIFICATION

**Version:** 1.0
**Date:** June 2024
**Status:** Ready for Development

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Product Definition](#2-product-definition)
3. [Dynamic Audience Strategy](#3-dynamic-audience-strategy)
4. [Information Architecture (IA)](#4-information-architecture-ia)
5. [User Flows](#5-user-flows)
6. [Screen-by-Screen Breakdown](#6-screen-by-screen-breakdown)
7. [Microcopy Per Screen](#7-microcopy-per-screen)
8. [Error States](#8-error-states)
9. [Empty States](#9-empty-states)
10. [Loading & Transition States](#10-loading--transition-states)
11. [Structural Recommendations](#11-structural-recommendations)
12. [Brand Design System](#12-brand-design-system)
13. [Component Design Specifications](#13-component-design-specifications)
14. [Motion Design System](#14-motion-design-system)
15. [Design Tokens](#15-design-tokens)
16. [Implementation Checklist](#16-implementation-checklist)

---

## 1. EXECUTIVE SUMMARY

**Product:** Monologg - The World's First Brief-to-Booking Pipeline for Performing Arts & Creator Economy

**Type:** Web App + Progressive Web App (PWA) with Mobile-First Approach

**Industry:** Creative Economy / Performing Arts / Creator Marketplace

**Core Problem:** Creators lose up to 20%+ income to intermediaries, while clients spend weeks sifting through static portfolios with no way to instantly coordinate schedules or lock contract payments.

**Key User Actions:**
1. Onboard & Verify Identity (AI-powered Thespian verification)
2. Create Storefront with Rate Cards & Availability
3. Discover & Filter Talent via AI-driven vibes
4. Book Talent with Escrow-backed Payments (Paystack)
5. Collaborate via Order Room with Milestone Tracking

---

## 2. PRODUCT DEFINITION

### 2.1 What is Monologg?

Monologg is the world's first brief-to-booking pipeline built specifically for the performing arts and creator economy. It functions as a high-performance transactional hybrid of three major industry paradigms:

| Platform Type | Function | Monologg Equivalent |
|---------------|----------|---------------------|
| IMDbPro | The Registry | Verified Talent Database, credits, media and professional credentials |
| Upwork | The Marketplace | Secure Escrow transactions, messaging, milestone contracts |
| Stan / Linktree | The Storefront | 1-Click Purchase, high conversion, integrated booking bio links |

**The Problem:** Currently, creators lose up to 20%+ of their income to agents and intermediaries, while clients spend weeks sifting through static portfolios with no way to instantly coordinate schedules or lock contract payments.

**The Solution:** Monologg connects talents directly to casting leads, brand agencies, and event coordinators. Through an integrated scheduling engine (resembling Calendly) and a transactional escrow drawer, we shrink the hiring process from weeks to 3 simple clicks.

---

## 3. DYNAMIC AUDIENCE STRATEGY

### 3.1 The Core Four (Primary Focus)

| Niche | Description | Media Focus |
|-------|-------------|-------------|
| **Actors** | Film/TV audition bookings | Monologue reels (Video) |
| **Comedians** | Corporate stand-up bookings | Live show sets (Video) |
| **Voice-Over (VO) Artists** | Remote studio sessions | Voice demos (Audio) |
| **Comperes** | Live event emcee bookings | Hosting reels (Video) |

### 3.2 Extended Creators (Inclusive Architecture)

Monologg is highly adaptable. Performative talents of all backgrounds will use the platform:

- Pastors / Public Speakers
- Musicians
- Content Creators
- Streamers

**UX Rule:** Do not use hyper-specific casting jargon that alienates extended creators.

| Instead of... | Use... |
|---------------|--------|
| "Add Cast Role Title" | "Add Booking Service Title" |
| "Upload Audition Tape" | "Upload Performance/Showcase Reel" |
| "Category Grids" | Dynamic, adaptive categories |

---

## 4. INFORMATION ARCHITECTURE (IA)

### 4.1 Complete Sitemap

```
MONOLOGG SITEMAP
│
├── 1. PUBLIC LANDING (Evergreen)
│   ├── 1.1 Pre-Launch (Waitlist)
│   │   ├── Hero Section (Toggleable)
│   │   ├── Email Waitlist Signup
│   │   ├── Queue Position Display
│   │   └── Share-to-Climb Feature
│   └── 1.2 Live Portal
│       ├── Hero Section (Post-Launch CTAs)
│       ├── "Post a Project / Find Talent" CTA
│       └── "Launch Your Storefront" CTA
│
├── 2. AUTHENTICATION
│   ├── 2.1 Login
│   ├── 2.2 Sign Up
│   │   ├── Role Selection (Talent / Client)
│   │   ├── Niche Selection (Core 4 + Extended)
│   │   └── Social Sign-On Options
│   └── 2.3 Password Recovery
│
├── 3. TALENT EXPERIENCE (Creator Flow)
│   ├── 3.1 Onboarding Flow
│   │   ├── 3.1.1 Welcome & Niche Selection
│   │   ├── 3.1.2 Media Upload (Thespian AI)
│   │   ├── 3.1.3 AI Processing (Loading State)
│   │   ├── 3.1.4 AI Verification Complete
│   │   └── 3.1.5 Storefront Setup
│   │
│   ├── 3.2 Talent Dashboard
│   │   ├── 3.2.1 Overview (Stats, Notifications)
│   │   ├── 3.2.2 My Storefront (Public View)
│   │   ├── 3.2.3 Rate Cards Management
│   │   ├── 3.2.4 Availability Calendar
│   │   └── 3.2.5 Earnings & Analytics
│   │
│   ├── 3.3 Talent Storefront (Public)
│   │   ├── 3.3.1 Profile Header (Verified Badge)
│   │   ├── 3.3.2 Showcase Reel (Media Player)
│   │   ├── 3.3.3 Rate Cards (Stacked)
│   │   ├── 3.3.4 AI Vibe Tags Display
│   │   └── 3.3.5 Booking CTA
│   │
│   └── 3.4 Order Room (Collaborative)
│       ├── 3.4.1 Escrow Milestone Bar
│       ├── 3.4.2 Chat Interface
│       ├── 3.4.3 File Attachments
│       └── 3.4.4 Transaction Timeline
│
├── 4. CLIENT EXPERIENCE (Employer Flow)
│   ├── 4.1 Onboarding Flow
│   │   ├── 4.1.1 Welcome & Company Setup
│   │   └── 4.1.2 Payment Method Setup
│   │
│   ├── 4.2 Client Dashboard
│   │   ├── 4.2.1 Overview (Recent Activity)
│   │   ├── 4.2.2 My Projects (Gig Management)
│   │   ├── 4.2.3 Talent Shortlist
│   │   └── 4.2.4 Bookings & Calendar
│   │
│   ├── 4.3 Project Brief Creation
│   │   ├── 4.3.1 Project Name & Type
│   │   ├── 4.3.2 Niche Requirements
│   │   ├── 4.3.3 Script/Asset Upload
│   │   └── 4.3.4 Budget Scale Slider
│   │
│   ├── 4.4 Talent Discovery
│   │   ├── 4.4.1 Search & Filter
│   │   ├── 4.4.2 Directory Feed
│   │   ├── 4.4.3 Talent Profile View
│   │   └── 4.4.4 Shortlist Management
│   │
│   └── 4.5 Order Room (Collaborative)
│       ├── 4.5.1 Escrow Milestone Bar
│       ├── 4.5.2 Chat Interface
│       ├── 4.5.3 File Attachments
│       └── 4.5.4 Payment Confirmation
│
├── 5. SETTINGS & PROFILE
│   ├── 5.1 Profile Management
│   ├── 5.2 Payment Methods
│   ├── 5.3 Notification Preferences
│   ├── 5.4 Security & Privacy
│   └── 5.5 Subscription/Plan
│
└── 6. SUPPORT & LEGAL
    ├── 6.1 Help Center
    ├── 6.2 FAQ
    ├── 6.3 Terms of Service
    ├── 6.4 Privacy Policy
    └── 6.5 Contact Support
```

### 4.2 Navigation Structure Recommendation

#### Primary Navigation (Bottom Bar - Mobile First)

| Icon | Label | Purpose |
|------|-------|---------|
| 🏠 | Home | Dashboard overview with stats |
| 🔍 | Discover | Talent discovery / Gig browsing |
| 📋 | Orders | Active projects & bookings |
| 💬 | Messages | Chat & notifications |
| 👤 | Profile | Storefront & settings |

#### Secondary Navigation (Top Bar / Sidebar - Desktop)

| Section | Items |
|---------|-------|
| **Main** | Dashboard, Discover, Orders, Messages |
| **For Talent** | My Storefront, Rate Cards, Availability, Earnings |
| **For Client** | Post Project, Shortlist, Analytics |
| **System** | Settings, Help, Logout |

**Rationale:**
- Bottom nav maximizes thumb reach on mobile
- Top nav for desktop provides quick access to all sections
- Role-based views ensure only relevant features are shown
- Progressive disclosure reduces cognitive load

---

## 5. USER FLOWS

### 5.1 Talent Onboarding & Verification Flow

```
START: Landing Page → "Launch Your Storefront" CTA
                    ↓
STEP 1: Registration
├── Email & Password
├── Role Selection (Talent / Client)
└── Niche Selection (Actor / VO / Comedian / Compere / Extended)
                    ↓
STEP 2: Thespian AI Upload
├── Drag & Drop Showreel (Video/Audio)
├── File Validation (Max 150MB)
├── Upload Progress Indicator
└── AI Processing Screen (Skeleton Loader)
                    ↓
STEP 3: AI Verification Complete
├── Verified Badge Display
├── Auto-Generated Vibe Tags
├── Profile Completion (Bio, Skills)
└── "Continue to Storefront" CTA
                    ↓
STEP 4: Storefront Setup
├── Rate Card Configuration
│   ├── Service Title
│   ├── Base Price ($)
│   └── Delivery Timeline
├── Availability Calendar Setup
└── "Publish Storefront" CTA
                    ↓
END: Storefront Live + Dashboard
```

**Decision Points:**
- **Niche Selection:** Filters media upload types (video vs audio)
- **AI Processing Success:** Auto-tags vs Manual input
- **Rate Card Setup:** Skip option (can complete later)

**Error Recovery:**
- **Upload Failed:** "Please check your connection and try again"
- **AI Processing Failed:** "We couldn't process your file. Please try another."
- **Storefront Incomplete:** "Complete your profile to start receiving bookings"

### 5.2 Client Booking Flow

```
START: Landing Page → "Post a Project / Find Talent" CTA
                    ↓
STEP 1: Project Brief
├── Project Name & Type
├── Niche Requirements
├── Script/Asset Upload
└── Budget Scale Selection
                    ↓
STEP 2: Talent Discovery
├── Search & Filter Directory
├── View Talent Profiles
├── Check AI Vibe Tags
└── Shortlist Favorites
                    ↓
STEP 3: Talent Selection
├── View Availability Calendar
├── Select Date & Time Slot
├── Confirm Talent & Service
└── "Proceed to Checkout" CTA
                    ↓
STEP 4: Escrow Checkout
├── Booking Summary
├── 12% Escrow Processing Fee
├── Payment Method Selection
└── "Confirm & Deposit" CTA
                    ↓
STEP 5: Order Room
├── Escrow Progress Bar
├── Chat Interface
├── File Sharing
└── Milestone Tracking
                    ↓
END: Booking Confirmed + Dashboard Updated
```

**Decision Points:**
- **Payment Success:** Proceed to Order Room
- **Payment Failure:** Retry or contact support
- **Talent Unavailable:** Show alternative dates/talent

**Error Recovery:**
- **Payment Failed:** "We couldn't process your payment. Please try again."
- **Talent Not Found:** "No talents match your criteria. Try adjusting filters."
- **Booking Conflict:** "This time slot is already booked. Please choose another."

### 5.3 Collaborative Order Room Flow

```
START: Booking Confirmed → Enter Order Room
                    ↓
ESCROW STATE: Locked (Funds held securely)
                    ↓
PHASE 1: Briefing
├── Client Uploads Scripts/Files
├── Talent Reviews Documents
├── Chat Communication
└── "I Confirm Brief" Toggle
                    ↓
PHASE 2: Deliverables
├── Talent Submits Work
├── Client Reviews Submissions
├── Revisions (if needed)
└── "Mark as Complete" Action
                    ↓
PHASE 3: Payment Release
├── Client Approves Final Work
├── Escrow Releases Funds
├── 9% Engine Fee Deducted
└── Talent Receives Payment
                    ↓
END: Transaction Complete + Review Prompt
```

**Decision Points:**
- **Revisions Needed:** Revert to Deliverables phase
- **Dispute:** Client/Talent can flag for support
- **Auto-Release:** 5-day auto-release if no action taken

---

## 6. SCREEN-BY-SCREEN BREAKDOWN

### 6.1 Onboarding Screens

#### Screen: OS-01 | Welcome & Niche Selection

| Element | Specification |
|---------|---------------|
| **Purpose** | User identifies their primary creative niche |
| **Key Elements** | Visual grid of niche cards, role selector |
| **Primary Action** | "Continue with [Niche]" CTA |
| **Secondary Actions** | "I'm a Client" toggle, "Skip for now" |
| **Navigation** | Back (landing), Forward (to upload) |

#### Screen: OS-02 | Thespian AI Media Upload

| Element | Specification |
|---------|---------------|
| **Purpose** | Upload primary showcase for AI verification |
| **Key Elements** | Drag & drop zone, file selector, format guidance |
| **Primary Action** | "Upload Showreel" CTA |
| **Secondary Actions** | "Upload Later" skip |
| **Navigation** | Back (niche), Forward (processing) |

#### Screen: OS-03 | AI Processing State

| Element | Specification |
|---------|---------------|
| **Purpose** | Show AI analysis progress |
| **Key Elements** | Skeleton loader, progress bar, status microcopy |
| **Primary Action** | None (auto-progress) |
| **Secondary Actions** | None |
| **Navigation** | None (auto-advances) |

#### Screen: OS-04 | AI Verification Complete

| Element | Specification |
|---------|---------------|
| **Purpose** | Display verification results and auto-tags |
| **Key Elements** | Verified badge, vibe tags, profile fields |
| **Primary Action** | "Continue to Storefront" CTA |
| **Secondary Actions** | "Edit Tags" manual override |
| **Navigation** | Back (upload), Forward (storefront) |

#### Screen: OS-05 | Rate Card Setup

| Element | Specification |
|---------|---------------|
| **Purpose** | Configure service rates and timelines |
| **Key Elements** | Service title input, price input, timeline input |
| **Primary Action** | "Add Another Service" / "Publish Storefront" |
| **Secondary Actions** | "Skip for now" |
| **Navigation** | Back (verification), Forward (publish) |

### 6.2 Talent Screens

#### Screen: T-01 | Talent Dashboard

| Element | Specification |
|---------|---------------|
| **Purpose** | Overview of earnings, bookings, notifications |
| **Key Elements** | Stats cards, recent activity, quick actions |
| **Primary Action** | "View Storefront" CTA |
| **Secondary Actions** | "Set Availability", "Manage Rate Cards" |
| **Navigation** | Bottom nav (Home, Discover, Orders, Messages, Profile) |

#### Screen: T-02 | Public Storefront

| Element | Specification |
|---------|---------------|
| **Purpose** | Public-facing booking page |
| **Key Elements** | Profile header, showreel, rate cards, vibe tags |
| **Primary Action** | "Book Now" CTA |
| **Secondary Actions** | "Share Profile" link |
| **Navigation** | Back to dashboard, external share |

#### Screen: T-03 | Rate Cards Management

| Element | Specification |
|---------|---------------|
| **Purpose** | Edit service offerings and pricing |
| **Key Elements** | Card list, add/edit/delete controls |
| **Primary Action** | "Save Changes" CTA |
| **Secondary Actions** | "Add New Service" |
| **Navigation** | Back to dashboard |

#### Screen: T-04 | Availability Calendar

| Element | Specification |
|---------|---------------|
| **Purpose** | Set weekly availability schedule |
| **Key Elements** | Calendar grid, time slot picker, sync status |
| **Primary Action** | "Save Schedule" CTA |
| **Secondary Actions** | "Sync with Google Calendar" |
| **Navigation** | Back to dashboard |

#### Screen: T-05 | Order Room (Collaborative)

| Element | Specification |
|---------|---------------|
| **Purpose** | Collaborative workspace for active orders |
| **Key Elements** | Escrow milestone bar, chat, file attachments |
| **Primary Action** | "Submit Deliverable" CTA |
| **Secondary Actions** | "Mark Complete", "Request Revision" |
| **Navigation** | Back to dashboard |

### 6.3 Client Screens

#### Screen: C-01 | Client Dashboard

| Element | Specification |
|---------|---------------|
| **Purpose** | Overview of projects, hires, spending |
| **Key Elements** | Stats cards, recent bookings, quick actions |
| **Primary Action** | "Post New Project" CTA |
| **Secondary Actions** | "Find Talent", "View All Bookings" |
| **Navigation** | Bottom nav (Home, Discover, Orders, Messages, Profile) |

#### Screen: C-02 | Project Brief Creation

| Element | Specification |
|---------|---------------|
| **Purpose** | Create detailed project brief |
| **Key Elements** | Project name, type, niche, script upload, budget slider |
| **Primary Action** | "Publish Project" CTA |
| **Secondary Actions** | "Save as Draft" |
| **Navigation** | Back to dashboard |

#### Screen: C-03 | Talent Discovery Directory

| Element | Specification |
|---------|---------------|
| **Purpose** | Browse and filter talent |
| **Key Elements** | Search bar, filter pills, talent cards |
| **Primary Action** | "View Profile" on talent cards |
| **Secondary Actions** | "Shortlist", "Book Now" |
| **Navigation** | Back to dashboard |

#### Screen: C-04 | Escrow Checkout

| Element | Specification |
|---------|---------------|
| **Purpose** | Complete payment with escrow protection |
| **Key Elements** | Booking summary, fee breakdown, payment methods |
| **Primary Action** | "Confirm & Deposit" CTA |
| **Secondary Actions** | "Apply Promo Code" |
| **Navigation** | Back to talent selection |

#### Screen: C-05 | Order Room (Collaborative)

| Element | Specification |
|---------|---------------|
| **Purpose** | Collaborative workspace for active orders |
| **Key Elements** | Escrow milestone bar, chat, file attachments |
| **Primary Action** | "Release Payment" CTA |
| **Secondary Actions** | "Request Revision", "Contact Support" |
| **Navigation** | Back to dashboard |

---

## 7. MICROCOPY PER SCREEN

### 7.1 Talent Onboarding Microcopy

| Screen | Element | Copy |
|--------|---------|------|
| **OS-01** | Title | "What brings you to Monologg?" |
| **OS-01** | Subtitle | "Select your primary creative focus to get started" |
| **OS-01** | CTA | "Continue with [Niche]" |
| **OS-01** | Helper | "You can always update this later" |
| **OS-02** | Title | "Upload Your Showcase Reel" |
| **OS-02** | Subtitle | "Drop your best performance clip for AI verification" |
| **OS-02** | Drop Zone | "Drag & drop your file here" |
| **OS-02** | File Types | "Supports: MP4, MOV, MP3, WAV (Max 150MB)" |
| **OS-03** | Title | "Thespian AI is reviewing your performance..." |
| **OS-03** | Status | "Analyzing vocal patterns and visual presence..." |
| **OS-04** | Title | "You're Verified! 🎉" |
| **OS-04** | Subtitle | "We've auto-generated these tags based on your style" |
| **OS-04** | AI Tags | "Warm Texture · Conversational Vibe · Expressive" |
| **OS-04** | CTA | "Continue to Your Storefront" |
| **OS-05** | Title | "Set Up Your Rate Cards" |
| **OS-05** | Subtitle | "Define what you offer and how much you charge" |
| **OS-05** | Service Input | "Service Name (e.g., Voice-Over Recording)" |
| **OS-05** | Price Input | "Base Price ($)" |
| **OS-05** | Timeline Input | "Delivery Timeline (e.g., 2-3 days)" |
| **OS-05** | CTA | "Publish Your Storefront" |

### 7.2 Talent Dashboard Microcopy

| Screen | Element | Copy |
|--------|---------|------|
| **T-01** | Title | "Welcome back, [Name]! 👋" |
| **T-01** | Subtitle | "Here's what's happening with your career today" |
| **T-01** | Stats | "Earnings This Month", "Active Bookings", "Profile Views" |
| **T-01** | Quick Action | "Set Availability", "Manage Rate Cards", "View Storefront" |
| **T-02** | Title | "[Name]'s Storefront" |
| **T-02** | Verified Badge | "✨ Verified Professional" |
| **T-02** | Rate Card | "[Service Name] – $[Price] · [Timeline]" |
| **T-02** | CTA | "Book Now" |
| **T-04** | Title | "Availability Calendar" |
| **T-04** | Subtitle | "Set your available hours for bookings" |
| **T-04** | Legend | "Available · Booked · Pending" |
| **T-05** | Title | "Order Room | [Project Name]" |
| **T-05** | Escrow Status | "💼 Escrow Locked – $[Amount] Held Securely" |
| **T-05** | Chat Input | "Message [Client/Talent]..." |
| **T-05** | Milestone | "📍 Escrow Locked → 📤 Deliverables → 💰 Payment Released" |

### 7.3 Client Microcopy

| Screen | Element | Copy |
|--------|---------|------|
| **C-01** | Title | "Welcome back, [Name]! 🎬" |
| **C-01** | Subtitle | "Your next project is just a few clicks away" |
| **C-01** | Stats | "Active Projects", "Talent Hired", "Total Spent" |
| **C-02** | Title | "Create Project Brief" |
| **C-02** | Subtitle | "Tell us what you need and we'll match you with talent" |
| **C-02** | Budget Slider | "Project Budget Range" |
| **C-02** | Script Upload | "Attach Script or Brief (PDF, DOC, DOCX)" |
| **C-03** | Title | "Discover Talent" |
| **C-03** | Search | "Search by name, skills, or vibe..." |
| **C-03** | Filters | "Core Focus · Vibe · Pricing · Location" |
| **C-04** | Title | "Secure Your Booking" |
| **C-04** | Fee Breakdown | "Base Rate: $[Amount] · 12% Escrow Fee: $[Amount]" |
| **C-04** | Payment | "Secure Checkout | Escrow Protection" |
| **C-04** | CTA | "Confirm & Deposit" |
| **C-05** | Title | "Order Room | [Project Name]" |
| **C-05** | Escrow Status | "💰 Escrow Locked – Funds Secured" |
| **C-05** | CTA | "Release Payment" |

---

## 8. ERROR STATES

### 8.1 Form Validation Errors

| Scenario | Headline | Body Copy | Recovery CTA |
|----------|----------|-----------|--------------|
| **Empty Field** | "This field is required" | "Please fill in this information to continue" | "OK" |
| **Invalid Email** | "Email format is invalid" | "Please use a valid email address (e.g., name@domain.com)" | "Fix Email" |
| **Password Too Short** | "Password is too weak" | "Use at least 8 characters with a number and symbol" | "Try Again" |
| **Payment Amount Invalid** | "Please enter a valid amount" | "Amount must be between $10 and $10,000" | "Adjust Amount" |
| **File Too Large** | "File exceeds limit" | "Max file size is 150MB. Please compress or try a different file" | "Choose New File" |
| **File Format Unsupported** | "File format not supported" | "We support MP4, MOV, MP3, and WAV formats" | "Select Supported File" |

### 8.2 Network & Connection Errors

| Scenario | Headline | Body Copy | Recovery CTA |
|----------|----------|-----------|--------------|
| **Upload Failed** | "Upload interrupted" | "We lost connection during upload. Your data is safe." | "Resume Upload" |
| **Network Error** | "Connection lost" | "Please check your internet connection and try again" | "Retry Connection" |
| **API Timeout** | "Request timed out" | "The server is taking longer than expected. Please wait." | "Try Again" |
| **Search Failed** | "Search unavailable" | "We're having trouble loading results. Please refresh." | "Refresh Search" |

### 8.3 Payment & Transaction Errors

| Scenario | Headline | Body Copy | Recovery CTA |
|----------|----------|-----------|--------------|
| **Payment Declined** | "Payment declined" | "Your payment was not processed. Please check your card details." | "Try Again" |
| **Insufficient Funds** | "Insufficient funds" | "The payment amount exceeds your available balance." | "Use Different Card" |
| **Escrow Holding Error** | "Couldn't secure funds" | "We couldn't complete the escrow hold. Please try again." | "Retry Payment" |
| **Payout Failed** | "Payout failed" | "We couldn't process your payout. Please verify bank details." | "Update Bank Info" |

### 8.4 Session & Permission Errors

| Scenario | Headline | Body Copy | Recovery CTA |
|----------|----------|-----------|--------------|
| **Session Expired** | "Session expired" | "You've been logged out for security. Please sign in again." | "Sign In" |
| **Permission Denied** | "Access restricted" | "You don't have permission to view this page." | "Go Back" |
| **Account Not Verified** | "Verification required" | "Complete your verification to access this feature." | "Verify Now" |
| **Two-Factor Required** | "Additional security needed" | "Please complete two-factor authentication to continue." | "Authenticate" |

### 8.5 Business Logic Errors

| Scenario | Headline | Body Copy | Recovery CTA |
|----------|----------|-----------|--------------|
| **Calendar Conflict** | "Time slot unavailable" | "This time slot is already booked. Please choose another." | "Choose Different Time" |
| **Duplicate Booking** | "Already requested" | "You've already sent a booking request to this talent." | "View Request" |
| **Talent Unavailable** | "Talent is currently unavailable" | "This talent is fully booked. See similar talents below." | "Browse Similar" |
| **Project Expired** | "Project posting expired" | "Your project brief has expired. Please repost to continue." | "Repost Project" |
| **Rate Card Missing** | "No services set up" | "Please set up your rate cards to start receiving bookings." | "Set Up Rate Cards" |

---

## 9. EMPTY STATES

### 9.1 First-Time User Empty States

| Screen | Illustration Idea | Headline | Supporting Copy | Primary CTA |
|--------|-------------------|----------|-----------------|-------------|
| **Talent Dashboard** | 🎭 Stage Spotlight | "No bookings yet" | "Complete your storefront to start receiving booking requests from clients" | "Setup Storefront" |
| **Rate Cards** | 💳 Empty Wallet | "No services listed" | "Add your first rate card to define what you offer and how much you charge" | "Add Service" |
| **Availability** | 📅 Empty Calendar | "No availability set" | "Set your available hours so clients know when to book you" | "Set Availability" |
| **Client Dashboard** | 📋 Empty Board | "No active projects" | "Post your first project to start finding amazing talent" | "Post Project" |
| **Shortlist** | ⭐ Empty Star | "No shortlisted talent" | "Save talent you're interested in by clicking the star icon" | "Browse Talent" |
| **Orders** | 📦 Empty Box | "No active orders" | "Your active bookings and projects will appear here once you've started collaborating" | "Find Talent" |

### 9.2 Zero-Result States (Search/Filter)

| Scenario | Illustration Idea | Headline | Supporting Copy | Primary CTA |
|----------|-------------------|----------|-----------------|-------------|
| **No Search Results** | 🔍 Magnifying Glass | "No results found" | "Try adjusting your search terms or filters to find what you're looking for" | "Clear Filters" |
| **No Talent Matches** | 👤 Ghost Silhouette | "No talent matches your criteria" | "Try broadening your search or removing some filters" | "Adjust Filters" |
| **No Projects Match** | 📋 Empty File | "No projects match your skills" | "Update your storefront and skills to get matched with more projects" | "Update Profile" |
| **No Messages** | 💬 Empty Chat | "No conversations yet" | "Start a conversation by booking talent or responding to inquiries" | "Find Talent" |

### 9.3 Completion States

| Scenario | Illustration Idea | Headline | Supporting Copy | Primary CTA |
|----------|-------------------|----------|-----------------|-------------|
| **Booking Complete** | ✅ Checkmark | "Booking confirmed!" | "Your booking has been confirmed. You can now collaborate in the Order Room." | "Go to Order Room" |
| **Payment Successful** | 💰 Money Bag | "Payment secured" | "Your funds are held securely in escrow until the project is complete." | "View Booking" |
| **Profile Published** | 🚀 Rocket | "Your storefront is live!" | "You're now visible to clients. Start sharing your link to get bookings!" | "Share Storefront" |
| **Project Posted** | 📢 Megaphone | "Project posted successfully" | "Your project brief is now live. Talents will start applying shortly." | "View Projects" |

---

## 10. LOADING & TRANSITION STATES

### 10.1 Loading States

| Screen | Loading Type | Copy | Visual Design |
|--------|--------------|------|---------------|
| **Dashboard** | Skeleton Screen | "Loading your dashboard..." | Animated skeleton cards with shimmer effect |
| **Talent Discovery** | Skeleton Grid | "Finding talent for you..." | Skeleton cards with circular avatars and text lines |
| **AI Processing** | Progress Bar | "Thespian AI is analyzing..." | Animated progress bar with status updates |
| **Payment Processing** | Spinner Overlay | "Processing your payment..." | Centered spinner with lock icon |
| **Search** | Skeleton List | "Searching..." | Skeleton text lines with shimmer |
| **Media Upload** | Progress Bar | "Uploading your file..." | Animated progress bar with file name |
| **Order Room** | Skeleton Chat | "Loading conversation..." | Skeleton message bubbles |

### 10.2 Transition States

| Action | Success State | Error State | Duration |
|--------|---------------|-------------|----------|
| **Booking Creation** | Success toast + redirect to Order Room | Error toast + retry button | 2s |
| **Payment Process** | Success overlay + confirmation | Error modal with details | 3s |
| **AI Verification** | Verified badge animation + redirect | Retry modal + upload again | 5-10s |
| **Profile Update** | Success toast + auto-refresh | Error toast with validation | 1s |
| **File Upload** | Success toast + preview | Error toast + retry | 2-5s |
| **Publish Storefront** | Success overlay + share prompt | Error toast + try again | 2s |
| **Message Sent** | Success feedback + auto-scroll | Error toast + retry | 1s |
| **Payment Release** | Success toast + redirect to dashboard | Error toast + support contact | 2s |

---

## 11. STRUCTURAL RECOMMENDATIONS

### 11.1 Navigation Pattern Recommendation

**Primary: Bottom Navigation (Mobile-First)**
**Secondary: Sidebar (Desktop)**

**Why:**
- Mobile-first aligns with target audience (creators on-the-go)
- Bottom nav maximizes thumb reach
- Sidebar on desktop provides comprehensive access
- Progressive disclosure reduces cognitive load
- Role-based views prevent unnecessary features

### 11.2 Potential Confusion Points & Solutions

| Screen/Flow | Confusion Risk | Solution |
|-------------|----------------|----------|
| **Niche Selection** | Users may not identify with specific categories | Use visual cards + "Other" option with text input |
| **AI Verification** | Users may be skeptical of AI processing | Show clear status messages and success criteria |
| **Rate Cards** | Creators struggle with pricing | Show market benchmarks + pricing suggestions |
| **Escrow Checkout** | Users may not trust platform fees | Clear fee breakdown + explain value proposition |
| **Order Room** | Users may not know what to do next | Prominent CTA + milestone guidance |
| **Talent vs Client** | Users may need both roles | Allow role switching + multi-account support |

### 11.3 Flows to Simplify or Merge

| Current Flow | Suggestion | Rationale |
|--------------|------------|-----------|
| **Rate Card Setup** | Pre-populate with industry benchmarks | Reduces decision paralysis |
| **Availability Calendar** | Integrate with Google Calendar sync | Reduces manual entry |
| **Talent Discovery** | Add AI recommendations | Reduces search time |
| **Project Brief** | Auto-fill from templates | Reduces friction |
| **Onboarding** | Progressive completion | Increases completion rates |

### 11.4 Progressive Disclosure Strategy

| Feature | When to Show | How to Reveal |
|---------|--------------|---------------|
| **AI Vibe Tags** | After verification | Auto-populated, editable |
| **Advanced Filters** | After initial search | Expandable filter panel |
| **Promo Codes** | After checkout | Toggleable promo input |
| **Analytics** | After first booking | Gradual stats introduction |
| **Team Features