import { useState } from "react";
import { Lock, CreditCard, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

/**
 * Checkout — "ticket stub" concept
 * Left: order summary styled like a ticket stub (perforated tear edge)
 * Right: payment form styled like the card itself being filled in
 *
 * Wire-up notes (for your Java backend):
 * - onPay() currently simulates a 1.8s processing delay.
 * - Replace the setTimeout block with a fetch("/api/payments/create-intent", {...})
 *   call to your Spring Boot PaymentController, then confirm with Stripe.js
 *   using the returned client_secret.
 */

const ORDER = {
  item: "Pro Plan — Annual",
  orderId: "ORD-48291",
  subtotal: 4999,
  tax: 450,
  currency: "₹",
};

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export default function CheckoutPage() {
  const [card, setCard] = useState("");
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [status, setStatus] = useState("idle"); // idle | processing | success
  const [error, setError] = useState("");

  const total = ORDER.subtotal + ORDER.tax;

  const isValid =
    card.replace(/\s/g, "").length === 16 &&
    name.trim().length > 1 &&
    expiry.length === 5 &&
    cvc.length >= 3;

  async function handlePay(e) {
  e.preventDefault();
  if (!isValid) {
    setError("Check the card details above — a field looks incomplete.");
    return;
  }
  setError("");
  setStatus("processing");

  try {
    // 1. Backend se order create karo
    const res = await fetch("http://localhost:9080/api/payments/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total * 100, currency: "INR" }), // rupees -> paise
    });

    if (!res.ok) {
      throw new Error("Order creation failed");
    }

    const data = await res.json();

    // 2. Razorpay popup ke options
    const options = {
      key: data.keyId,
      amount: data.amount,
      currency: data.currency,
      order_id: data.orderId,
      name: "Your Company",
      description: ORDER.item,
      handler: async function (response) {
        // 3. Payment hone ke baad backend se verify karo
        const verifyRes = await fetch("http://localhost:9080/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(response),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.status === "success") {
          setStatus("success");
        } else {
          setStatus("idle");
          setError("Payment verification failed.");
        }
      },
      modal: {
        ondismiss: () => setStatus("idle"), // user ne popup band kiya bina pay kiye
      },
      theme: { color: "#E8B84B" },
    };

    // 4. Razorpay popup kholo
    const rzp = new window.Razorpay(options);
    rzp.open();
  } catch (err) {
    setStatus("idle");
    setError("Could not start payment. Try again.");
  }
}

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#0B0E14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        fontFamily:
          "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
        .ticket-input::placeholder { color: #5A5F70; }
        .ticket-input:focus { outline: none; border-color: #E8B84B !important; }
        .pay-btn:hover:not(:disabled) { background: #F0C667 !important; }
        .pay-btn:focus-visible { outline: 2px solid #E8B84B; outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) {
          .spin { animation: none !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 880,
          minHeight: 480,
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6)",
          position: "relative",
        }}
      >
        {/* LEFT: ticket stub */}
        <div
          style={{
            flex: "0 0 38%",
            background: "#151926",
            padding: "40px 32px",
            color: "#F2F0EA",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "#8A8F9E",
                textTransform: "uppercase",
                marginBottom: 24,
              }}
            >
              {ORDER.orderId}
            </div>

            <div
              style={{
                fontFamily: "Fraunces, serif",
                fontSize: 26,
                fontWeight: 500,
                lineHeight: 1.25,
                marginBottom: 6,
              }}
            >
              {ORDER.item}
            </div>
            <div style={{ fontSize: 13, color: "#8A8F9E", marginBottom: 36 }}>
              Billed once, renews automatically
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Row label="Subtotal" value={`${ORDER.currency}${ORDER.subtotal.toLocaleString("en-IN")}`} />
              <Row label="Tax" value={`${ORDER.currency}${ORDER.tax.toLocaleString("en-IN")}`} />
            </div>
          </div>

          <div>
            <div
              style={{
                borderTop: "1px dashed #353B4D",
                margin: "20px 0",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
              }}
            >
              <span style={{ fontSize: 13, color: "#8A8F9E" }}>Total due</span>
              <span
                style={{
                  fontFamily: "Fraunces, serif",
                  fontSize: 34,
                  fontWeight: 600,
                  color: "#E8B84B",
                }}
              >
                {ORDER.currency}{total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* perforation notches along the tear edge */}
          <Perforation />
        </div>

        {/* RIGHT: payment form */}
        <div
          style={{
            flex: 1,
            background: "#1C2030",
            padding: "40px 36px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {status === "success" ? (
            <SuccessState amount={`${ORDER.currency}${total.toLocaleString("en-IN")}`} orderId={ORDER.orderId} />
          ) : (
            <form onSubmit={handlePay} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 28,
                }}
              >
                <CreditCard size={18} color="#E8B84B" />
                <span
                  style={{
                    fontFamily: "Fraunces, serif",
                    fontSize: 19,
                    color: "#F2F0EA",
                  }}
                >
                  Pay with card
                </span>
              </div>

              <Field label="Card number">
                <input
                  className="ticket-input"
                  value={card}
                  onChange={(e) => setCard(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  style={inputStyle}
                />
              </Field>

              <Field label="Name on card">
                <input
                  className="ticket-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="As it appears on the card"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <Field label="Expiry">
                    <input
                      className="ticket-input"
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      inputMode="numeric"
                      style={inputStyle}
                    />
                  </Field>
                </div>
                <div style={{ flex: 1 }}>
                  <Field label="CVC">
                    <input
                      className="ticket-input"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      placeholder="123"
                      inputMode="numeric"
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>

              {error && (
                <div
                  style={{
                    fontSize: 13,
                    color: "#E8694F",
                    marginTop: 4,
                    marginBottom: 8,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ flex: 1 }} />

              <button
                type="submit"
                className="pay-btn"
                disabled={status === "processing"}
                style={{
                  background: "#E8B84B",
                  color: "#14171F",
                  border: "none",
                  borderRadius: 12,
                  padding: "15px 0",
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: "Inter, sans-serif",
                  cursor: status === "processing" ? "default" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 18,
                  opacity: status === "processing" ? 0.85 : 1,
                  transition: "background 0.15s ease",
                }}
              >
                {status === "processing" ? (
                  <>
                    <span
                      className="spin"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid rgba(20,23,31,0.3)",
                        borderTopColor: "#14171F",
                        display: "inline-block",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                    Processing payment
                  </>
                ) : (
                  <>
                    Pay {ORDER.currency}{total.toLocaleString("en-IN")}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 16,
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                <Lock size={12} />
                Card details are encrypted and never touch this server
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5 }}>
      <span style={{ color: "#8A8F9E" }}>{label}</span>
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#D8D6CE" }}>{value}</span>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          color: "#8A8F9E",
          marginBottom: 6,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Perforation() {
  const dots = Array.from({ length: 14 });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: -8,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "8px 0",
      }}
    >
      {dots.map((_, i) => (
        <span
          key={i}
          style={{
            width: 16,
            height: 16,
            borderRadius: "50%",
            background: "#0B0E14",
          }}
        />
      ))}
    </div>
  );
}

function SuccessState({ amount, orderId }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: 14,
        animation: "pop 0.35s ease",
      }}
    >
      <CheckCircle2 size={44} color="#5BC08A" />
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, color: "#F2F0EA" }}>
        Payment received
      </div>
      <div style={{ fontSize: 13.5, color: "#8A8F9E", maxWidth: 260 }}>
        {amount} charged successfully. A receipt for {orderId} has been sent to your email.
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "#6B7280",
          marginTop: 6,
        }}
      >
        <ShieldCheck size={13} />
        Verified by your payment gateway
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#14171F",
  border: "1px solid #2A2F40",
  borderRadius: 10,
  padding: "12px 14px",
  fontSize: 14,
  color: "#F2F0EA",
  fontFamily: "'IBM Plex Mono', monospace",
  boxSizing: "border-box",
};
