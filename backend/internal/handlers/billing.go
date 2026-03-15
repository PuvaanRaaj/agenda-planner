package handlers

import (
	"database/sql"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/stripe/stripe-go/v76"
	portalsession "github.com/stripe/stripe-go/v76/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v76/checkout/session"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/webhook"

	"agenda-planner/backend/internal/middleware"
)

func stripeKey() string { return os.Getenv("STRIPE_SECRET_KEY") }

func planPriceID(plan string) string {
	switch plan {
	case "starter":
		return os.Getenv("STRIPE_PRICE_STARTER")
	case "basic":
		return os.Getenv("STRIPE_PRICE_BASIC")
	case "pro":
		return os.Getenv("STRIPE_PRICE_PRO")
	}
	return ""
}

func priceIDToPlan(priceID string) string {
	plans := []string{"starter", "basic", "pro"}
	for _, p := range plans {
		if planPriceID(p) == priceID && priceID != "" {
			return p
		}
	}
	return "free"
}

type checkoutRequest struct {
	Plan string `json:"plan"`
}

func (h *Handler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	stripe.Key = stripeKey()
	userID, _ := middleware.GetUserID(r.Context())

	var req checkoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		jsonError(w, "invalid request", http.StatusBadRequest)
		return
	}

	priceID := planPriceID(req.Plan)
	if priceID == "" {
		jsonError(w, "invalid plan or billing not configured", http.StatusBadRequest)
		return
	}

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	var email string
	var stripeCustomerID sql.NullString
	if err := h.DB.QueryRow(`SELECT email, stripe_customer_id FROM users WHERE id = $1`, userID).
		Scan(&email, &stripeCustomerID); err != nil {
		internalError(w, err)
		return
	}

	cusID := stripeCustomerID.String
	if !stripeCustomerID.Valid || cusID == "" {
		cus, err := customer.New(&stripe.CustomerParams{Email: stripe.String(email)})
		if err != nil {
			internalError(w, err)
			return
		}
		cusID = cus.ID
		if _, err = h.DB.Exec(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, cusID, userID); err != nil {
			internalError(w, err)
			return
		}
	}

	sess, err := checkoutsession.New(&stripe.CheckoutSessionParams{
		Customer: stripe.String(cusID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{Price: stripe.String(priceID), Quantity: stripe.Int64(1)},
		},
		SuccessURL: stripe.String(appURL + "/billing/success"),
		CancelURL:  stripe.String(appURL + "/pricing"),
	})
	if err != nil {
		internalError(w, err)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"url": sess.URL})
}

func (h *Handler) CustomerPortal(w http.ResponseWriter, r *http.Request) {
	stripe.Key = stripeKey()
	userID, _ := middleware.GetUserID(r.Context())

	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000"
	}

	var stripeCustomerID sql.NullString
	if err := h.DB.QueryRow(`SELECT stripe_customer_id FROM users WHERE id = $1`, userID).
		Scan(&stripeCustomerID); err != nil || !stripeCustomerID.Valid || stripeCustomerID.String == "" {
		jsonError(w, "no active subscription", http.StatusBadRequest)
		return
	}

	sess, err := portalsession.New(&stripe.BillingPortalSessionParams{
		Customer:  stripe.String(stripeCustomerID.String),
		ReturnURL: stripe.String(appURL + "/dashboard"),
	})
	if err != nil {
		internalError(w, err)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"url": sess.URL})
}

func (h *Handler) StripeWebhook(w http.ResponseWriter, r *http.Request) {
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	webhookSecret := os.Getenv("STRIPE_WEBHOOK_SECRET")
	event, err := webhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), webhookSecret)
	if err != nil {
		log.Printf("webhook signature error: %v", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	switch event.Type {
	case "customer.subscription.created", "customer.subscription.updated":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil || len(sub.Items.Data) == 0 {
			break
		}
		plan := priceIDToPlan(sub.Items.Data[0].Price.ID)
		if _, err := h.DB.Exec(
			`UPDATE users SET plan = $1, stripe_subscription_id = $2 WHERE stripe_customer_id = $3`,
			plan, sub.ID, sub.Customer.ID,
		); err != nil {
			log.Printf("webhook: failed to update plan: %v", err)
		}

	case "customer.subscription.deleted":
		var sub stripe.Subscription
		if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
			break
		}
		if _, err := h.DB.Exec(
			`UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_customer_id = $1`,
			sub.Customer.ID,
		); err != nil {
			log.Printf("webhook: failed to reset plan: %v", err)
		}

	case "invoice.payment_failed":
		log.Printf("invoice payment failed, event id: %s", event.ID)
	}

	w.WriteHeader(http.StatusOK)
}
