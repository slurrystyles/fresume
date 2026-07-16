import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Razorpay from "razorpay";
import crypto from "crypto";

// Initialize admin supabase client using service key if available, otherwise fallback to anon key for sandbox testing
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

// Lazy initialization of Razorpay to prevent startup crash
let razorpayClient: any = null;
function getRazorpay() {
  if (!razorpayClient) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      razorpayClient = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
  }
  return razorpayClient;
}

export async function POST(request: Request) {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const client = getRazorpay();
    const isSandboxAllowed = !isProduction && !client;

    // Check if the request is a Webhook from Razorpay
    const webhookSignature = request.headers.get("x-razorpay-signature") || request.headers.get("X-Razorpay-Signature");
    
    if (webhookSignature) {
      const rawBody = await request.text();
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";
      
      let isWebhookVerified = false;
      if (webhookSecret) {
        const expectedSignature = crypto
          .createHmac("sha256", webhookSecret)
          .update(rawBody)
          .digest("hex");
        isWebhookVerified = expectedSignature === webhookSignature;
      } else if (isSandboxAllowed) {
        // Fallback for simulation testing in development if secret is missing
        isWebhookVerified = true;
      }

      if (!isWebhookVerified) {
        return NextResponse.json({ success: false, error: "Invalid webhook signature verification." }, { status: 400 });
      }

      const eventData = JSON.parse(rawBody);
      const event = eventData.event;
      
      // Extract notes and userId from the webhook payload safely
      const notes = eventData.payload?.payment?.entity?.notes || 
                    eventData.payload?.order?.entity?.notes || 
                    eventData.payload?.subscription?.entity?.notes || {};
      const userId = notes.userId;

      if (userId && supabase) {
        const endsAt = new Date();
        
        if (event === "order.paid" || event === "payment.captured" || event === "subscription.charged") {
          endsAt.setMonth(endsAt.getMonth() + 12); // Grant 1 year access
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            tier: "pro",
            status: "active",
            ends_at: endsAt.toISOString(),
          }, { onConflict: "user_id" });
        } else if (event === "subscription.cancelled" || event === "subscription.halted" || event === "subscription.expired") {
          // Downgrade to free on subscription cancellation
          await supabase.from("subscriptions").upsert({
            user_id: userId,
            tier: "free",
            status: "cancelled",
            ends_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
        }
      }

      return NextResponse.json({ success: true, received: true, event });
    }

    // Standard frontend API actions
    const body = await request.json();
    const { action, amount, userId, email, orderId, paymentId, signature } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: "Missing required userId." }, { status: 400 });
    }

    if (action === "create_order") {
      const orderAmount = amount || 149900; // in paisa (₹1,499.00 INR)
      
      if (client) {
        // Real Razorpay order creation
        const order = await client.orders.create({
          amount: orderAmount,
          currency: "INR",
          receipt: `receipt_pro_${userId.slice(0, 8)}_${Date.now()}`,
          notes: {
            userId,
            email: email || "",
          }
        });

        return NextResponse.json({
          success: true,
          real: true,
          keyId: process.env.RAZORPAY_KEY_ID,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
        });
      } else {
        // Sandbox Simulation Mode (Only allowed in non-production development environments)
        if (!isSandboxAllowed) {
          return NextResponse.json({
            success: false,
            error: "Payment gateway misconfiguration: Real Razorpay keys are required in production."
          }, { status: 500 });
        }

        console.warn("Razorpay credentials missing. Operating in high-fidelity checkout simulation mode.");
        const simulatedOrderId = `order_sim_${Math.random().toString(36).substring(2, 12)}`;
        return NextResponse.json({
          success: true,
          real: false,
          keyId: "rzp_test_simulated",
          orderId: simulatedOrderId,
          amount: orderAmount,
          currency: "INR",
        });
      }
    }

    if (action === "verify_payment") {
      let isVerified = false;

      if (client) {
        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!keySecret) {
          return NextResponse.json({ success: false, error: "Razorpay secret key is missing on server." }, { status: 500 });
        }

        if (!signature || !orderId || !paymentId) {
          return NextResponse.json({ success: false, error: "Missing required verification signature." }, { status: 400 });
        }

        // Real Cryptographic Verification (HMAC SHA-256)
        // Verifies signature against orderId + "|" + paymentId before write
        const text = orderId + "|" + paymentId;
        const generated_signature = crypto
          .createHmac("sha256", keySecret)
          .update(text)
          .digest("hex");

        isVerified = generated_signature === signature;
      } else {
        // Sandbox verification (Only allowed in development when sandbox is active)
        if (!isSandboxAllowed) {
          return NextResponse.json({
            success: false,
            error: "Verification failed: Sandbox billing bypass is blocked in production."
          }, { status: 403 });
        }
        isVerified = true;
      }

      if (isVerified) {
        // Upgrade user premium subscription in database
        if (supabase) {
          const endsAt = new Date();
          endsAt.setMonth(endsAt.getMonth() + 12); // 1-year access

          const { error: subError } = await supabase
            .from("subscriptions")
            .upsert({
              user_id: userId,
              tier: "pro",
              status: "active",
              ends_at: endsAt.toISOString(),
            }, { onConflict: "user_id" });

          if (subError) {
            console.error("Supabase subscription upgrade error:", subError);
            // Fallback: try inserting fresh record
            await supabase.from("subscriptions").insert({
              user_id: userId,
              tier: "pro",
              status: "active",
              ends_at: endsAt.toISOString(),
            });
          }
        }

        return NextResponse.json({
          success: true,
          verified: true,
          message: "Payment successfully verified and upgraded to Pro Ledger Plan!",
        });
      } else {
        return NextResponse.json({
          success: false,
          verified: false,
          error: "Signature verification failed.",
        }, { status: 400 });
      }
    }

    return NextResponse.json({ success: false, error: "Invalid billing action." }, { status: 400 });

  } catch (err: any) {
    console.error("Razorpay API Handler exception:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to process billing." }, { status: 500 });
  }
}
