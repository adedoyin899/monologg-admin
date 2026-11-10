import React, { useState } from "react";
import { motion } from "motion/react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import { CreditCard, Layers, Clock } from "lucide-react";

interface PaystackModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  email?: string;
  onSuccess: () => void;
}

export function PaystackModal({
  isOpen,
  onClose,
  amount,
  email = "client@filmcraft.ng",
  onSuccess,
}: PaystackModalProps) {
  const [tab, setTab] = useState<"card" | "transfer" | "ussd">("card");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formattedAmount = amount.toLocaleString();

  const handlePay = () => {
    setProcessing(true);
    setTimeout(() => {
      setProcessing(false);
      onSuccess();
    }, 600);
  };

  return (
    <Modal onClose={() => { if (!processing) onClose(); }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="p-0 max-w-md w-full rounded-2xl overflow-hidden bg-white text-slate-900 shadow-2xl border border-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Paystack Header */}
        <div className="bg-[#0BA4DB] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-bold text-sm">
              P
            </div>
            <div>
              <div className="text-xs font-semibold tracking-wide text-white/90">PAYSTACK SECURE CHECKOUT</div>
              <div className="text-[11px] text-white/75">Monologg Creative · {email}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono font-bold text-lg text-white">₦{formattedAmount}</div>
            <div className="text-[10px] text-white/80">Secured 256-Bit</div>
          </div>
        </div>

        {/* Paystack Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <button
            type="button"
            onClick={() => setTab("card")}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              tab === "card"
                ? "border-[#0BA4DB] text-[#0BA4DB] bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Card</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("transfer")}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              tab === "transfer"
                ? "border-[#0BA4DB] text-[#0BA4DB] bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Transfer</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("ussd")}
            className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
              tab === "ussd"
                ? "border-[#0BA4DB] text-[#0BA4DB] bg-white dark:bg-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>USSD</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-4">
          {processing ? (
            <div className="py-10 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#0BA4DB] border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-sm font-bold text-slate-900 dark:text-white">Authorizing payment with bank...</div>
              <div className="text-xs text-slate-500">Please do not close this window</div>
            </div>
          ) : (
            <>
              {tab === "card" && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    Simulate instant card payment via Paystack:
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-slate-500">Card Number</label>
                    <Input readOnly value="4084 ···· ···· 9410 (Visa)" className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-slate-500">Valid Thru</label>
                      <Input readOnly value="12 / 28" className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1 text-slate-500">CVV</label>
                      <Input readOnly value="123" className="font-mono text-xs bg-slate-50 dark:bg-slate-800" />
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 text-xs font-bold text-white shadow-md mt-2 cursor-pointer"
                    style={{ background: "#0BA4DB" }}
                    onClick={handlePay}
                  >
                    Pay ₦{formattedAmount}
                  </Button>
                </div>
              )}

              {tab === "transfer" && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    Transfer exactly <strong>₦{formattedAmount}</strong> to the dedicated virtual account:
                  </div>
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Bank</span>
                      <span className="text-xs font-bold">Wema Bank</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Account Number</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">0128 4930 21</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText("0128493021");
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="text-xs px-2 py-0.5 rounded bg-[#0BA4DB]/10 text-[#0BA4DB] font-semibold hover:bg-[#0BA4DB]/20 transition-colors cursor-pointer"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Beneficiary</span>
                      <span className="text-xs font-medium">Monologg / Paystack</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px] text-amber-600 dark:text-amber-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires in 29:45</span>
                      <span>Single-use account</span>
                    </div>
                  </div>
                  <Button
                    className="w-full h-11 text-xs font-bold text-white shadow-md cursor-pointer"
                    style={{ background: "#0BA4DB" }}
                    onClick={handlePay}
                  >
                    I Have Sent ₦{formattedAmount}
                  </Button>
                </div>
              )}

              {tab === "ussd" && (
                <div className="space-y-3">
                  <div className="text-xs text-slate-500">
                    Dial this code on your mobile phone to authorize payment:
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center space-y-1">
                    <div className="text-xs text-slate-500 font-semibold">GTBank USSD Code</div>
                    <div className="font-mono font-bold text-base text-[#0BA4DB] tracking-wider">
                      *737*2*{amount}*0128#
                    </div>
                    <div className="text-[11px] text-slate-400">Works with your linked mobile number</div>
                  </div>
                  <Button
                    className="w-full h-11 text-xs font-bold text-white shadow-md cursor-pointer"
                    style={{ background: "#0BA4DB" }}
                    onClick={handlePay}
                  >
                    I Have Dialed the Code
                  </Button>
                </div>
              )}

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium cursor-pointer"
                >
                  Cancel and return to Monologg
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </Modal>
  );
}
