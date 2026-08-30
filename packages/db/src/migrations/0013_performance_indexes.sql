CREATE INDEX IF NOT EXISTS "idx_checkout_sessions_stripe_session" ON "checkout_sessions" USING btree ("stripe_checkout_session_id");
CREATE INDEX IF NOT EXISTS "idx_orders_address_id" ON "orders" USING btree ("address_id");
CREATE INDEX IF NOT EXISTS "idx_orders_quote_id" ON "orders" USING btree ("quote_id");
CREATE INDEX IF NOT EXISTS "idx_orders_stripe_payment_intent" ON "orders" USING btree ("stripe_payment_intent_id");
CREATE INDEX IF NOT EXISTS "idx_addresses_formatted_address" ON "addresses" USING btree ("formatted_address");
CREATE INDEX IF NOT EXISTS "idx_notifications_customer_id" ON "notifications" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_order_id" ON "notifications" USING btree ("order_id");
