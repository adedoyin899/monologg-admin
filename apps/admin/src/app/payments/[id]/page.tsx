"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  adminClient,
  type PaymentDetailResponse,
} from "@/lib/admin-client";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dialog } from "@/components/ui/Dialog";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Code,
  Calendar,
  DollarSign,
  Layers,
  Shield,
  Clock,
  Copy,
  Check,
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

export default function PaymentDetailPage() {
  const params = useParams();
  const paymentId = params?.id as string;

  const [data, setData] = useState<PaymentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw Webhook modal state
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawReason, setRawReason] = useState("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [rawEvents, setRawEvents] = useState<any[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    const fetchDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await adminClient.getPayment(paymentId);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment detail");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [paymentId]);

  const handleRevealRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawReason.trim()) {
      setRevealError("Reason is required to view raw webhook payloads");
      return;
    }

    setIsRevealing(true);
    setRevealError(null);
    try {
      const res = await adminClient.getPaymentRawWebhook(paymentId, rawReason.trim());
      setRawEvents(res.events || []);
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : "Access denied or failed to load payload");
    } finally {
      setIsRevealing(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

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
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <AlertTriangle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Payment Record Not Found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{error || "Payment not found"}</p>
        <Link
          href="/payments"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Payments
        </Link>
      </div>
    );
  }

  const { payment, booking, events } = data;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Link
            href="/payments"
            className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono text-gray-900 dark:text-white">
                {payment.id}
              </h1>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                {payment.status}
              </span>
              <span className="text-[11px] uppercase font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {payment.provider}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Ref: <strong className="font-mono">{payment.providerRef || "—"}</strong></span>
              <span>·</span>
              <span>Created {new Date(payment.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* View Raw Webhook Action */}
        <button
          onClick={() => {
            setRawModalOpen(true);
            setRawEvents(null);
            setRevealError(null);
            setRawReason("");
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
        >
          <Code className="h-4 w-4 text-primary" />
          <span>Inspect Raw Webhooks</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Payment Details & Associated Booking */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Payment Summary
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-gray-100 dark:border-gray-800 text-xs">
              <div>
                <span className="text-gray-500 block mb-1">Amount</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Currency</span>
                <span className="font-semibold text-gray-900 dark:text-white">{payment.currency}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Escrow State</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  {payment.escrowHeld ? (
                    <>
                      <Lock className="h-3.5 w-3.5 text-emerald-500" />
                      Held in Escrow
                    </>
                  ) : (
                    <>
                      <Unlock className="h-3.5 w-3.5 text-gray-400" />
                      Not Held
                    </>
                  )}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">Provider Ref</span>
                <span className="font-mono text-gray-800 dark:text-gray-200 truncate block">
                  {payment.providerRef || "—"}
                </span>
              </div>
            </div>

            {/* Linked Booking */}
            {booking && (
              <div className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Linked Booking: {booking.id}
                  </span>
                  <Link
                    href={`/bookings/${booking.id}`}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    View Booking
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700">
                  <div>
                    <span className="text-gray-500 block">Payer (Client):</span>
                    <strong className="text-gray-900 dark:text-white">{booking.client.name}</strong>
                    <div className="text-[11px] font-mono text-gray-500">{booking.client.email}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Recipient (Talent):</span>
                    <strong className="text-gray-900 dark:text-white">{booking.talent.name}</strong>
                    <div className="text-[11px] font-mono text-gray-500">{booking.talent.email}</div>
                  </div>
                  <div className="col-span-2 pt-2 border-t border-gray-200/60 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-500">
                    <span>Origin: <strong className="text-gray-800 dark:text-gray-200">{booking.origin}</strong></span>
                    <span>State: <strong className="text-gray-800 dark:text-gray-200">{booking.state}</strong></span>
                    {booking.slotDate && (
                      <span>Slot: <strong className="text-gray-800 dark:text-gray-200">{new Date(booking.slotDate).toLocaleDateString()}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Card 2: Webhook Events Audit Log */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Payment Events & Webhook Log
              </h2>
              <span className="text-xs text-gray-400 font-mono">
                {events.length} event(s)
              </span>
            </div>

            {events.length === 0 ? (
              <div className="p-6 text-center text-xs text-gray-500">
                No webhook events recorded for this payment yet.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((ev, idx) => (
                  <div
                    key={ev.id || idx}
                    className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">{ev.type}</span>
                        {ev.isDuplicate && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            DUPLICATE
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          {ev.processingResult}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                        Provider Event ID: {ev.eventId}
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-gray-500 sm:text-right">
                      {new Date(ev.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1 col) */}
        <div className="space-y-6">
          {/* Card 3: Fee Breakdown from Stored Amounts */}
          <Card className="p-6">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Platform Cut & Fees
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Gross Payment Amount</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Client Platform Fee (+15%)</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  +{formatCurrency(payment.clientFee, payment.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-gray-100 dark:border-gray-800">
                <span className="text-gray-500">Talent Platform Fee (-11%)</span>
                <span className="font-semibold text-rose-500">
                  -{formatCurrency(payment.talentFee, payment.currency)}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 bg-purple-50 dark:bg-purple-950/30 px-3 rounded-lg font-bold">
                <span className="text-purple-900 dark:text-purple-200">Total Platform Revenue</span>
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  {formatCurrency(payment.platformRevenue, payment.currency)}
                </span>
              </div>

              <div className="pt-2 text-[10px] text-gray-400 dark:text-gray-500 italic">
                {payment.feeBreakdownLabel}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Raw Webhook Modal (Restricted to SUPER_ADMIN & FINANCE) */}
      <Dialog
        open={rawModalOpen}
        onClose={() => setRawModalOpen(false)}
        title="Inspect Raw Webhook Payload"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
            <strong>Access Restricted & Audited:</strong> Viewing raw JSON webhooks is restricted to <strong>FINANCE</strong> and <strong>SUPER_ADMIN</strong>. All card numbers, CVVs, and bank account numbers are automatically masked.
          </div>

          {!rawEvents ? (
            <form onSubmit={handleRevealRaw} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Justification Reason (Mandatory):
                </label>
                <textarea
                  rows={3}
                  value={rawReason}
                  onChange={(e) => setRawReason(e.target.value)}
                  placeholder="e.g. Investigating transaction mismatch or webhook delivery latency..."
                  className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {revealError && (
                <div className="text-xs text-rose-600 font-medium">{revealError}</div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRawModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRevealing || !rawReason.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {isRevealing ? "Auditing & Decrypting..." : "Reveal Webhook JSON"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto space-y-3">
                {rawEvents.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-gray-900 text-gray-200 font-mono text-[11px] relative">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
                      <span className="text-amber-400 font-bold">{item.type}</span>
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(item.raw, null, 2), idx)}
                        className="text-gray-400 hover:text-white p-1"
                        title="Copy JSON"
                      >
                        {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(item.raw, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setRawModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
}
