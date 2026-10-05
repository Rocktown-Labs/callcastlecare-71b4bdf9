CREATE TYPE "public"."route_status" AS ENUM('draft', 'published', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."route_stop_status" AS ENUM('planned', 'en_route', 'arrived', 'in_progress', 'completed', 'skipped', 'cancelled');--> statement-breakpoint
CREATE TABLE "route_stops" (
	"actual_arrived_at" timestamp with time zone,
	"actual_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"planned_end_at" timestamp with time zone,
	"planned_start_at" timestamp with time zone,
	"route_id" integer NOT NULL,
	"sequence" integer NOT NULL,
	"status" "route_stop_status" DEFAULT 'planned' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worker_routes" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" text,
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Field route' NOT NULL,
	"route_date" date NOT NULL,
	"status" "route_status" DEFAULT 'draft' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"worker_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_worker_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."worker_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_routes" ADD CONSTRAINT "worker_routes_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worker_routes" ADD CONSTRAINT "worker_routes_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_route_stops_route_order" ON "route_stops" USING btree ("route_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_route_stops_route_sequence" ON "route_stops" USING btree ("route_id","sequence");--> statement-breakpoint
CREATE INDEX "idx_route_stops_order_id" ON "route_stops" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_worker_routes_worker_date" ON "worker_routes" USING btree ("worker_id","route_date");--> statement-breakpoint
CREATE INDEX "idx_worker_routes_date_status" ON "worker_routes" USING btree ("route_date","status");