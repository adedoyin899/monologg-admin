"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  adminClient,
  type BookingDetailResponse,
  type BookingTimelineItem,
} from "@/lib/admin-client";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dialog } from "@/components/ui/Dialog";
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  FileText,
  Phone,
  Video,
  ShieldAlert,
  User,
  Building,
  Lock,
  Unlock,
  CreditCard,
  Layers,
  History,
  AlertCircle,
  Info,
} from "lucide-react";

function formatCurrency(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString()}`;
  }
}

function getStateBadge(state: string) {
  switch (state) {
    case "PENDING_PAYMENT":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
          Pending Payment
        </span>
      );
    case "ESCROW_LOCKED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
          Escrow Locked
        </span>
      );
    case "DELIVERABLES_PROVIDED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
          Deliverables Provided
        </span>
      );
    case "PAYMENT_RELEASED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
          Payment Released
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          Cancelled
        </span>
      );
    case "DISPUTED":
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
          Disputed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          {state}
        </span>
      );
  }
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.id as string;

  const [data, setData] = useState<BookingDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminClient.getBooking(bookingId);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load booking details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Failed to Load Booking</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error || "Booking not found"}</p>
        <Link
          href="/bookings"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Bookings
        </Link>
      </div>
    );
  }

  const { booking, orderRoom, timeline } = data;

  return (
    <div className="space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Link
            href="/bookings"
            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                {booking.id}
              </h1>
              {getStateBadge(booking.state)}
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {booking.origin}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Created {new Date(booking.createdAt).toLocaleString()}</span>
              <span>·</span>
              <span>Age in state: <strong className="font-mono">{booking.ageInState.human}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          {/* Review Conversation Button (Dispute-Gated) */}
          <div className="relative group">
            <button
              onClick={() => {
                if (booking.canReviewConversation) {
                  setReviewModalOpen(true);
                }
              }}
              disabled={!booking.canReviewConversation}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${
                booking.canReviewConversation
                  ? "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed border border-gray-200 dark:border-gray-700"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Review conversation</span>
            </button>
            {!booking.canReviewConversation && (
              <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-20 w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none">
                {booking.reviewDisabledReason || "Opens only from an open dispute or ticket"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stuck Alert Banner */}
      {booking.isStuck && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-amber-900 dark:text-amber-200">
              Booking is Stuck: {booking.stuckReason}
            </h4>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              This booking has exceeded the operational threshold in state{" "}
              <strong>{booking.state}</strong> (age: {booking.ageInState.human}). Operations or Support attention may be required.
            </p>
          </div>
        </div>
      )}

      {/* Dispute Alert Banner */}
      {booking.hasDispute && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs">
            <h4 className="font-bold text-rose-900 dark:text-rose-200">
              Active Dispute or Support Ticket Linked
            </h4>
            <p className="text-rose-700 dark:text-rose-400 mt-0.5">
              {booking.disputeDetail?.subject || "An active dispute has been raised for this booking."}{" "}
              Chat transcript review is enabled under dispute audit protocol.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Summary & Parties */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Booking Parties & Service
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              {/* Talent Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Talent / Creator</span>
                  <Link
                    href={`/users/${booking.talent.userId}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View User 360
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  {booking.talent.avatarUrl ? (
                    <img
                      src={booking.talent.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {booking.talent.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {booking.talent.name}
                      {booking.talent.celebrityBadge && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 px-1 rounded font-semibold">
                          VERIFIED
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{booking.talent.niche}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <div>Email: <span className="font-mono text-gray-800 dark:text-gray-200">{booking.talent.email}</span></div>
                  <div>Phone: <span className="font-mono text-gray-800 dark:text-gray-200">{booking.talent.phone || "—"}</span></div>
                </div>
              </div>

              {/* Client Card */}
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Client / Buyer</span>
                  <Link
                    href={`/users/${booking.client.userId}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View User 360
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-3">
                  {booking.client.avatarUrl ? (
                    <img
                      src={booking.client.avatarUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200 flex items-center justify-center font-bold text-sm">
                      {booking.client.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      {booking.client.name}
                    </h3>
                    {booking.client.orgName && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{booking.client.orgName}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                  <div>Email: <span className="font-mono text-gray-800 dark:text-gray-200">{booking.client.email}</span></div>
                  <div>Phone: <span className="font-mono text-gray-800 dark:text-gray-200">{booking.client.phone || "—"}</span></div>
                </div>
              </div>
            </div>

            {/* Service & Schedule Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 text-xs">
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Service Title</span>
                <span className="font-semibold text-gray-900 dark:text-white">{booking.service.title}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Engagement Type</span>
                <span className="font-semibold text-gray-900 dark:text-white">{booking.engagementType}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Slot Date</span>
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-gray-400" />
                  {new Date(booking.slotDate).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-1">Slot Time</span>
                <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-gray-400" />
                  {booking.slotStart} - {booking.slotEnd}
                </span>
              </div>
            </div>

            {/* Meet URL & Notes */}
            {(booking.meetUrl || booking.contextNote) && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-2 text-xs">
                {booking.meetUrl && (
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" />
                    <span className="font-medium text-gray-700 dark:text-gray-300">Live Call URL:</span>
                    <a
                      href={booking.meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline font-mono truncate max-w-sm"
                    >
                      {booking.meetUrl}
                    </a>
                  </div>
                )}
                {booking.contextNote && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 block mb-0.5">Booking Context Note:</span>
                    {booking.contextNote}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Card 2: Audit Timeline */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Booking Lifecycle & Audit Timeline
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {timeline.length} events logged
              </span>
            </div>

            <div className="space-y-4">
              {timeline.map((item, idx) => (
                <div key={item.id || idx} className="relative pl-6 pb-4 last:pb-0 border-l-2 border-gray-200 dark:border-gray-800">
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center ${
                      item.isGap
                        ? "bg-amber-500"
                        : item.type === "STATE_CHANGE"
                        ? "bg-primary"
                        : item.type === "PAYMENT_EVENT"
                        ? "bg-blue-500"
                        : "bg-gray-400"
                    }`}
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {item.title}
                      {item.isGap && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          TELEMETRY GAP
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>

                  {item.isGap && (
                    <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Historical state transition without direct product event. Reconstructed from database state and payment records.
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          {/* Card 3: Fee Breakdown from Stored Amounts */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Fee Breakdown
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Stored Base Amount</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(booking.baseAmount, booking.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Client Platform Fee (+15%)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(booking.clientFeeAmount, booking.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800 font-bold">
                <span className="text-gray-900 dark:text-white">Total Paid by Client</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {formatCurrency(booking.clientTotal, booking.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Talent Platform Fee (-11%)</span>
                <span className="font-semibold text-rose-500">
                  -{formatCurrency(booking.talentFeeAmount, booking.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 bg-emerald-50 dark:bg-emerald-950/30 px-3 rounded-lg font-bold">
                <span className="text-emerald-900 dark:text-emerald-200">Net Talent Payout</span>
                <span className="text-sm text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(booking.talentNet, booking.currency)}
                </span>
              </div>

              <div className="pt-2 text-[10px] text-gray-400 dark:text-gray-500 italic">
                {booking.feeBreakdownLabel}
              </div>
            </div>
          </Card>

          {/* Card 4: Payment Status */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              Payment & Escrow Status
            </h2>

            {booking.payment ? (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Provider</span>
                  <span className="font-semibold uppercase text-gray-900 dark:text-white">
                    {booking.payment.provider}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Provider Reference</span>
                  <span className="font-mono text-gray-900 dark:text-white truncate max-w-[140px]">
                    {booking.payment.providerRef || "—"}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Payment Status</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {booking.payment.status}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">Escrow Held</span>
                  <span className="flex items-center gap-1 font-semibold">
                    {booking.payment.escrowHeld ? (
                      <>
                        <Lock className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Locked in Escrow</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-500">Not Held</span>
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-gray-500 dark:text-gray-400">Authorized At</span>
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {booking.payment.createdAt
                      ? new Date(booking.payment.createdAt).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-gray-500 dark:text-gray-400">
                No payment initiated yet for this booking.
              </div>
            )}
          </Card>

          {/* Card 5: Order Room Metadata */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              Order Room Metadata
            </h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Total Messages</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm">
                  {orderRoom.totalMessages}
                </span>
              </div>

              {/* Counts by kind */}
              <div>
                <span className="text-gray-500 dark:text-gray-400 block mb-2 font-medium">Activity Breakdown:</span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Text</span>
                    <span className="font-bold">{orderRoom.countsByKind.TEXT}</span>
                  </div>
                  <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Voice</span>
                    <span className="font-bold">{orderRoom.countsByKind.VOICE}</span>
                  </div>
                  <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Files / Docs</span>
                    <span className="font-bold">{orderRoom.countsByKind.DOCUMENT}</span>
                  </div>
                  <div className="p-2 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Calls</span>
                    <span className="font-bold">{orderRoom.countsByKind.CALL}</span>
                  </div>
                  <div className="col-span-2 p-2 rounded bg-gray-50 dark:bg-gray-800 flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">System Notices</span>
                    <span className="font-bold">{orderRoom.countsByKind.SYSTEM}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Last Room Activity</span>
                <span className="font-mono text-gray-700 dark:text-gray-300">
                  {orderRoom.lastActivityAt
                    ? new Date(orderRoom.lastActivityAt).toLocaleString()
                    : "—"}
                </span>
              </div>

              {/* Privacy Notice Banner */}
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700 text-[11px] text-gray-500 dark:text-gray-400 flex items-start gap-2">
                <Lock className="h-4 w-4 shrink-0 text-gray-400 mt-0.5" />
                <span>
                  Message content is hidden to preserve user privacy (M5.2 / AC3). Conversation review is strictly gated to open disputes or tickets.
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Review Conversation Modal */}
      <Dialog
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        title="Dispute Conversation Review"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
            <strong>Active Dispute Protocol:</strong> This booking has an active dispute status or linked ticket. Full transcript inspection with audit logging will be available in Phase A9 (Disputes & Resolution).
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
            <div>Booking ID: <strong className="font-mono">{booking.id}</strong></div>
            <div>Dispute status: <strong>{booking.disputeDetail?.status || "DISPUTED"}</strong></div>
            <div>Linked Ticket: <strong>{booking.disputeDetail?.ticketId || "Pending Ticket Assignment"}</strong></div>
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
