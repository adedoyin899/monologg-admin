import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { apiClient } from "../../lib/api-client";
import { trackEvent } from "../../lib/analytics";
import { appStateSync } from "../../lib/state-sync";

const imgIconArrowRight = "/assets/home/516903b6b524bafd57d55118edffff86c955eb80.svg";
const imgFooterLogoMask = "/assets/home/45e3a432e2cddd322c39a5781adf6f519ae0d4b9.svg";
const imgFooterLogoGroup = "/assets/home/90c066260aa6f6efbbb91efe5aa2953c523138f5.svg";

interface WebsiteFooterProps {
  /** Override for "Get started for free" CTA click */
  onGetStarted?: () => void;
  /** Override for "Become an investor" CTA click */
  onBecomeInvestor?: () => void;
  /** Whether to show the top grey CTA banner ("Finish Your Project today!") */
  showCtaBanner?: boolean;
  /** Whether to show "Powered by paystack" badge in the brand column (defaults to false for now, can be toggled on later) */
  showPoweredByPaystack?: boolean;
}

export function WebsiteFooter({
  onGetStarted,
  onBecomeInvestor,
  showCtaBanner = true,
  showPoweredByPaystack = false,
}: WebsiteFooterProps) {
  const navigate = useNavigate();
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSubmitted, setNewsletterSubmitted] = useState(false);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#newsletter") {
      const el = document.getElementById("newsletter");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("input");
        if (input) input.focus();
      }
    }
  }, []);

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
      return;
    }
    const loggedIn = appStateSync.getLoggedInUser();
    if (loggedIn) {
      navigate(loggedIn.userType === "TALENT" ? "/dashboard" : "/client");
      return;
    }
    navigate("/auth?mode=signup");
  };

  const handleInvestor = () => {
    if (onBecomeInvestor) {
      onBecomeInvestor();
      return;
    }
    if (typeof window !== "undefined" && window.location.pathname === "/resources") {
      const el = document.getElementById("investor");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
          window.history.pushState(null, "", "/resources#investor");
        } catch {}
        return;
      }
    }
    navigate("/resources#investor");
    setTimeout(() => {
      const el = document.getElementById("investor");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newsletterEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@") || cleanEmail.length < 5) {
      return;
    }

    setNewsletterSubmitting(true);
    setNewsletterFeedback(null);

    const subscriberId = "sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const sourcePath = typeof window !== "undefined" ? window.location.pathname : "website_footer";

    const payload = {
      id: subscriberId,
      email: cleanEmail,
      source: sourcePath,
      status: "ACTIVE",
      metadata: {
        submittedAt: new Date().toISOString(),
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      },
    };

    try {
      // 1. Direct Supabase Storage into public."NewsletterSubscriber"
      if (supabase) {
        const { error } = await supabase.from("NewsletterSubscriber").upsert(payload, { onConflict: "email" });
        if (error) {
          console.warn("Supabase NewsletterSubscriber insert warning:", error.message);
        }
      }

      // 2. Fallback through backend API client
      try {
        await apiClient.subscribeNewsletter(cleanEmail, sourcePath);
      } catch {
        // Backend failure non-blocking if Supabase or mock succeeded
      }

      // 3. Telemetry tracking event
      trackEvent("waitlist_submitted", {
        type: "newsletter_subscription",
        subscriberId,
        email: cleanEmail,
        source: sourcePath,
      });

      setNewsletterSubmitted(true);
      setNewsletterFeedback("Thanks for subscribing!");
      setNewsletterEmail("");
    } catch (err) {
      console.warn("Newsletter subscription exception:", err);
      setNewsletterSubmitted(true);
      setNewsletterFeedback("Thanks for subscribing!");
      setNewsletterEmail("");
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-start relative w-full" data-node-id="178151:50146">
      {/* ─── CTA Section (178190:29887) ─── */}
      {showCtaBanner && (
        <section
          className="bg-[#f9f9f9] dark:bg-[#1a1a1a] border-y border-transparent dark:border-[#1a1a1a] flex flex-col items-center justify-center px-6 md:px-12 lg:px-[200px] py-20 lg:py-[120px] relative shrink-0 w-full"
          data-node-id="178190:29887"
          data-name="CTA sections"
        >
          <div
            className="flex flex-col md:flex-row justify-between items-start gap-10 md:gap-12 lg:gap-16 relative shrink-0 w-full max-w-[1040px]"
            data-node-id="178190:29888"
          >
            <div
              className="flex flex-col items-start justify-center relative shrink-0 w-full md:w-auto md:max-w-[420px]"
              data-node-id="178190:29889"
            >
              <div
                className="flex flex-col items-start justify-center relative shrink-0 w-full"
                data-node-id="178190:29890"
              >
                <div
                  className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[36px] md:text-[48px] leading-[48px] tracking-[-1.44px] w-full"
                  data-node-id="178190:29891"
                  style={{ fontFeatureSettings: '"cv01" 1' }}
                >
                  <p className="leading-[48px] mb-0">{`Finish Your `}</p>
                  <p className="leading-[48px]">Project today!</p>
                </div>
              </div>
            </div>

            <div
              className="flex flex-1 flex-col gap-[40px] items-start md:items-end justify-center min-w-px relative w-full"
              data-node-id="178190:29892"
            >
              <div
                className="flex flex-col gap-[36px] md:gap-[48px] items-start relative shrink-0 w-full md:max-w-[480px]"
                data-node-id="178190:29893"
              >
                <p
                  className="font-['Inter',sans-serif] font-normal leading-[1.54] not-italic relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[18px] whitespace-pre-wrap"
                  data-node-id="178190:29894"
                  style={{ fontFeatureSettings: '"cv01" 1' }}
                >{`Connect directly with directors, studios, agencies, brand managers, and live event organizers globally  with zero agent commissions.`}</p>

                <div
                  className="flex flex-wrap gap-[12px] items-center justify-start relative shrink-0"
                  data-node-id="178190:29895"
                >
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    className="bg-[#f13030] hover:bg-[#d92626] text-white transition-colors cursor-pointer flex gap-[8px] h-[48px] items-center justify-center overflow-clip px-[24px] py-[8px] relative rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0"
                    data-node-id="178190:29896"
                    data-name="Button"
                  >
                    <span
                      className="flex flex-col font-['Plus_Jakarta_Sans',sans-serif] font-semibold justify-center relative shrink-0 text-[14px] leading-[16px] text-center text-white tracking-[-0.12px] whitespace-nowrap"
                      data-node-id="178190:29898"
                    >
                      Get started for free
                    </span>
                    <span className="relative shrink-0 size-[16px]" data-node-id="178190:29899" data-name="Icon / ArrowRight">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconArrowRight} />
                    </span>
                  </button>

                  <div className="flex flex-row items-center self-stretch" data-node-id="178190:29901">
                    <button
                      type="button"
                      onClick={handleInvestor}
                      className="bg-[#f8f8f8] dark:bg-[#000000] hover:bg-[#e8e8e8] dark:hover:bg-[#333333] transition-colors cursor-pointer border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex gap-[8px] h-[48px] items-center justify-center px-[24px] py-[8px] relative rounded-[23px] shrink-0"
                      data-name="Button"
                    >
                      <span
                        className="flex flex-col font-['Plus_Jakarta_Sans',sans-serif] font-medium justify-center relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] leading-[24px] whitespace-nowrap"
                        data-node-id="I178190:29901;178030:12893"
                      >
                        Become an investor
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── Footer Section (178151:49520) ─── */}
      <footer
        className="bg-white dark:bg-[#000000] flex flex-col gap-[40px] items-center pb-[48px] pt-16 lg:pt-[112px] px-6 md:px-12 lg:px-[200px] relative shrink-0 w-full"
        data-node-id="178151:49520"
        data-name="Section"
      >
        <div className="flex flex-col gap-[40px] items-center w-full max-w-[1040px]">
          {/* Newsletter Row */}
          <div
            className="flex flex-col items-start justify-center relative shrink-0 w-full"
            data-node-id="178151:49521"
            data-name="Container"
          >
            <div
              className="flex flex-col md:flex-row gap-6 md:gap-0 items-start md:items-center justify-between relative shrink-0 w-full"
              data-node-id="178151:49522"
              data-name="Content"
            >
              <div className="flex flex-1 flex-row items-center self-stretch" data-node-id="178151:49523">
                <div
                  className="flex flex-1 flex-col gap-[8px] h-full items-start min-w-px relative"
                  data-name="Text and supporting text"
                >
                  <div
                    className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[24px] leading-[40px] text-center tracking-[-0.72px] whitespace-nowrap"
                    data-node-id="178151:49524"
                  >
                    <p className="leading-[40px]">Join our newsletter</p>
                  </div>
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[16px] tracking-[0.48px] max-w-[344px]"
                    data-node-id="178151:49525"
                    style={{ fontFeatureSettings: '"zero" 1' }}
                  >
                    Stay updated with our investor news and receive alerts about upcoming funding rounds
                  </p>
                </div>
              </div>

              <div
                id="newsletter"
                className="flex items-center justify-start md:justify-end relative shrink-0 w-full md:w-[289px]"
                data-node-id="178151:49526"
                data-name="Email capture"
              >
                <form
                  onSubmit={handleNewsletterSubmit}
                  className="bg-white dark:bg-[#1a1a1a] border border-[#e8e8e8] dark:border-[#1a1a1a] border-solid flex items-center justify-between overflow-clip px-[13px] py-[9px] relative rounded-[20px] shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1)] shrink-0 w-[258px]"
                  data-node-id="178151:49527"
                  data-name="Input Styles"
                >
                  <input
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      if (newsletterSubmitted) setNewsletterSubmitted(false);
                    }}
                    placeholder={newsletterSubmitted ? (newsletterFeedback || "Thanks for subscribing!") : "Enter your email"}
                    aria-label="Enter your email"
                    disabled={newsletterSubmitting}
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[20px] relative text-[#1a1a1a] dark:text-[#f9f9f9] placeholder:text-[#767676] dark:placeholder:text-[#767676] text-[14px] tracking-[0.42px] bg-transparent outline-none min-w-0 flex-1 pr-2"
                    data-node-id="178151:49528"
                    style={{ fontFeatureSettings: '"zero" 1, "cv01" 1, "cv02" 1, "cv03" 1, "cv04" 1, "cv07" 1, "cv10" 1, "cv11" 1' }}
                    required
                  />
                  <button
                    type="submit"
                    aria-label="Subscribe to newsletter"
                    disabled={newsletterSubmitting}
                    className="bg-[#f13030] hover:bg-[#d92626] text-white transition-colors cursor-pointer relative rounded-[23px] shadow-[0px_4px_6px_-1px_rgba(0,0,0,0.1),0px_2px_4px_-2px_rgba(0,0,0,0.1)] shrink-0 disabled:opacity-50"
                    data-node-id="178151:49529"
                    data-name="Button"
                  >
                    <div className="bg-clip-padding border-0 border-transparent border-solid flex gap-[8px] items-center justify-center overflow-clip px-[8px] py-[4px] relative rounded-[inherit] size-full">
                      {newsletterSubmitting ? (
                        <div className="size-[16px] border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className="relative shrink-0 size-[16px]" data-node-id="178151:49532" data-name="Icon / ArrowRight">
                          <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconArrowRight} />
                        </div>
                      )}
                    </div>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Divider 1 */}
          <div
            className="bg-[#e8e8e8] dark:bg-[#1a1a1a] h-px relative shrink-0 w-full"
            data-node-id="178151:49533"
            data-name="Divider"
          />

          {/* Brand & Links Row */}
          <div
            className="flex flex-col items-start relative shrink-0 w-full"
            data-node-id="178151:49534"
            data-name="Container"
          >
            <div
              className="flex flex-col md:flex-row gap-10 md:gap-0 items-start justify-between relative shrink-0 w-full"
              data-node-id="178151:49535"
              data-name="Content"
            >
              {/* Left: Logo and supporting text */}
              <div
                className="flex flex-col gap-[16px] items-start relative shrink-0"
                data-node-id="178151:49536"
                data-name="Logo and supporting text"
              >
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="h-[21px] overflow-clip relative shrink-0 w-[91.97px] cursor-pointer text-left"
                  data-node-id="178151:49537"
                  data-name="Img - Monologg"
                >
                  <div
                    className="absolute contents inset-[13.77%_80.78%_14.5%_3.56%]"
                    data-node-id="178151:49538"
                    data-name="Clip path group"
                  >
                    <div
                      className="absolute inset-[14.65%_81%_15.49%_3.78%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-0.203px_-0.188px] mask-size-[14.407px_15.063px]"
                      data-node-id="178151:49541"
                      style={{
                        maskImage: `url("${imgFooterLogoMask}")`,
                        WebkitMaskImage: `url("${imgFooterLogoMask}")`,
                      }}
                      data-name="Group"
                    >
                      <div className="absolute inset-[-1.34%_-1.4%_-1.64%_-1.4%]">
                        <img alt="" className="block max-w-none size-full" src={imgFooterLogoGroup} />
                      </div>
                    </div>
                  </div>
                  <div
                    className="absolute flex flex-col font-['Switzer',sans-serif] font-medium inset-[19.04%_-0.41%_23.81%_22.12%] justify-center not-italic text-[#1a1a1a] dark:text-[#f9f9f9] text-[16.406px] text-center tracking-[-0.4922px] whitespace-nowrap"
                    data-node-id="178151:49549"
                  >
                    <p className="leading-[26.25px]">Monologg</p>
                  </div>
                </button>

                <div
                  className="flex flex-col gap-[24px] items-start relative shrink-0 w-full"
                  data-node-id="178151:49550"
                >
                  <p
                    className="font-['Inter_Tight',sans-serif] font-normal leading-[20px] not-italic relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[14px] tracking-[0.42px] w-[248px]"
                    data-node-id="178151:49551"
                  >
                    The Upwork for Actors, Public speakers, Comperes, Comedians, Streamers, Artists, musicians and Creators.
                  </p>
                  {showPoweredByPaystack && (
                    <div
                      className="flex gap-[8px] items-center relative shrink-0"
                      data-node-id="178151:49552"
                    >
                      <p
                        className="font-['Inter_Tight',sans-serif] font-normal leading-[24px] not-italic relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[14px] tracking-[0.42px] whitespace-nowrap"
                        data-node-id="178151:49553"
                      >
                        Powered by
                      </p>
                      <div className="flex items-center gap-[6px] relative shrink-0" data-name="Paystack Badge">
                        <svg
                          className="h-[18px] w-[18px] shrink-0"
                          viewBox="0 0 24 24"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-label="Paystack icon"
                        >
                          <rect x="2" y="3.5" width="11" height="3" rx="1.5" fill="#00C3F7" />
                          <rect x="2" y="8.5" width="16" height="3" rx="1.5" fill="#00C3F7" />
                          <rect x="2" y="13.5" width="20" height="3" rx="1.5" fill="#00C3F7" />
                          <rect x="2" y="18.5" width="14" height="3" rx="1.5" fill="#00C3F7" />
                        </svg>
                        <span className="font-['Plus_Jakarta_Sans',sans-serif] font-extrabold text-[15px] tracking-[-0.4px] text-[#1a1a1a] dark:text-[#f9f9f9] lowercase leading-none">
                          paystack
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: 3 Columns of Links */}
              <div
                className="grid grid-cols-2 sm:grid-cols-3 gap-[32px] items-start relative shrink-0 w-full md:w-[540px]"
                data-node-id="178151:49569"
                data-name="Links"
              >
                {/* Product Column */}
                <div
                  className="flex flex-col gap-[16px] items-start min-w-px relative"
                  data-node-id="178151:49570"
                  data-name="_Footer links column"
                >
                  <div
                    className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] w-full"
                    data-node-id="178151:49571"
                  >
                    <p className="leading-[normal]">Product</p>
                  </div>
                  <div
                    className="flex flex-col gap-[12px] items-start relative shrink-0 w-full"
                    data-node-id="178151:49572"
                    data-name="Footer links"
                  >
                    <button
                      type="button"
                      onClick={() => navigate("/dashboard")}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49576"
                    >
                      Performer Portal
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/client")}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49580"
                    >
                      Client Portal
                    </button>
                    <div
                      className="flex gap-[8px] items-center relative shrink-0"
                      data-node-id="178151:49581"
                      data-name="_Footer link"
                    >
                      <button
                        type="button"
                        onClick={() => navigate("/product")}
                        className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                        data-node-id="178151:49584"
                      >
                        Thespian AI
                      </button>
                      <div
                        className="flex gap-[4px] items-center justify-center relative shrink-0"
                        data-node-id="178151:49585"
                      >
                        <div
                          className="bg-[rgba(241,48,48,0.8)] border-[0.5px] border-[rgba(241,48,48,0.4)] border-solid relative rounded-full shrink-0 size-[4px]"
                          data-node-id="178151:49586"
                          data-name="Background"
                        />
                        <div
                          className="flex flex-col font-['Geist_Mono',monospace] font-normal justify-center not-italic relative shrink-0 text-[#f13030] text-[12px] tracking-[1.26px] uppercase whitespace-nowrap"
                          data-node-id="178151:49587"
                        >
                          <p className="leading-[normal]">new</p>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate("/pricing")}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49591"
                    >
                      Pricing
                    </button>
                  </div>
                </div>

                {/* Resources Column */}
                <div
                  className="flex flex-col gap-[16px] items-start min-w-px relative"
                  data-node-id="178151:49663"
                  data-name="_Footer links column"
                >
                  <div
                    className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] w-full"
                    data-node-id="178151:49664"
                  >
                    <p className="leading-[normal]">Resources</p>
                  </div>
                  <div
                    className="flex flex-col gap-[12px] items-start relative shrink-0 w-full"
                    data-node-id="178151:49665"
                    data-name="Footer links"
                  >
                    <button
                      type="button"
                      onClick={() => navigate("/terms")}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49669"
                    >
                      Terms of Services
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/cookies")}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                    >
                      Cookie Policy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== "undefined") {
                          window.dispatchEvent(new CustomEvent("monologg:open-consent-preferences"));
                        }
                      }}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                    >
                      Analytics Preferences
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById("faq");
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                        } else {
                          navigate("/#faq");
                        }
                      }}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49681"
                    >
                      FAQ
                    </button>
                    <button
                      type="button"
                      onClick={handleInvestor}
                      className="flex items-center relative shrink-0 cursor-pointer text-left font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49685"
                    >
                      Become an investor
                    </button>
                  </div>
                </div>

                {/* Social Column */}
                <div
                  className="flex flex-col gap-[16px] items-start min-w-px relative"
                  data-node-id="178151:49686"
                  data-name="_Footer links column"
                >
                  <div
                    className="flex flex-col font-['Switzer',sans-serif] font-medium justify-center not-italic relative shrink-0 text-[#1a1a1a] dark:text-[#f9f9f9] text-[16px] w-full"
                    data-node-id="178151:49687"
                  >
                    <p className="leading-[normal]">Social</p>
                  </div>
                  <div
                    className="flex flex-col gap-[12px] items-start relative shrink-0 w-full"
                    data-node-id="178151:49688"
                    data-name="Footer links"
                  >
                    <a
                      href="mailto:hello@monologg.co"
                      className="flex items-center relative shrink-0 font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49692"
                    >
                      hello@monologg.co
                    </a>
                    <a
                      href="https://www.instagram.com/getmonologg"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center relative shrink-0 font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49696"
                    >
                      Instagram
                    </a>
                    <a
                      href="https://x.com/getmonologg"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center relative shrink-0 font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49700"
                    >
                      X (Twitter)
                    </a>
                    <a
                      href="https://linkedin.com/company/monologg"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center relative shrink-0 font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                    >
                      LinkedIn
                    </a>
                    <a
                      href="https://www.producthunt.com"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center relative shrink-0 font-['Inter_Tight',sans-serif] font-normal leading-[24px] text-[#767676] dark:text-[#a3a3a3] hover:text-[#1a1a1a] dark:hover:text-[#f9f9f9] transition-colors text-[14px] tracking-[0.42px] whitespace-nowrap"
                      data-node-id="178151:49712"
                    >
                      Product Hunt
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div
            className="flex flex-col gap-[32px] items-start relative shrink-0 w-full"
            data-node-id="178151:49780"
            data-name="Container"
          >
            <div
              className="bg-[#e8e8e8] dark:bg-[#1a1a1a] h-px relative shrink-0 w-full"
              data-node-id="178151:49781"
              data-name="Divider"
            />
            <div
              className="flex flex-col sm:flex-row font-['Inter_Tight',sans-serif] font-normal gap-4 sm:gap-[32px] items-start sm:items-center justify-between leading-[24px] not-italic relative shrink-0 text-[#767676] dark:text-[#a3a3a3] text-[14px] tracking-[0.42px] w-full"
              data-node-id="178151:49782"
              data-name="Content"
            >
              <p className="relative" data-node-id="178151:49783">
                {`© 2026 Monologg. All rights reserved. `}
              </p>
              <div
                className="flex items-center gap-[8px] relative shrink-0 whitespace-nowrap text-[#767676] dark:text-[#a3a3a3]"
                data-node-id="178407:19721"
                data-name="Location"
              >
                <span>Lagos, Nigeria 🇳🇬</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
