import { Award, Sparkles, Zap } from "lucide-react";

export const EarnWorkflowSpecs = () => (
  <section className="relative bg-[#080c16] py-12 text-white">
    <div aria-hidden="true" className="relative">
      <img
        alt="CastleCare Pro Field Dispatch Workflow"
        className="h-96 w-full object-cover"
        src="/media/castlecare_pro_dispatch_workflow.jpg"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#080c16] via-[#080c16]/60 to-transparent" />
    </div>

    <div className="relative mx-auto -mt-16 max-w-7xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
      <div className="mx-auto max-w-2xl text-center lg:max-w-4xl">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Field Dispatch & Photo Proof Specifications
        </h2>
        <p className="mt-4 text-base text-slate-300">
          How CastleCare dispatches jobs, verifies arrival, enforces quality
          standards with before/after photos and videos, and releases instant
          direct deposits.
        </p>
      </div>

      <dl className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 sm:gap-y-16 lg:max-w-none lg:grid-cols-3 lg:gap-x-8">
        <div className="border-t border-white/20 pt-4">
          <dt className="font-bold text-lime-300">
            1. Route & Arrival Dispatch
          </dt>
          <dd className="mt-2 text-sm leading-6 text-slate-300">
            Jobs are automatically clustered into 2-hour arrival windows near
            your ZIP code radius. Tap &quot;En Route&quot; to notify customer.
          </dd>
        </div>
        <div className="border-t border-white/20 pt-4">
          <dt className="font-bold text-lime-300">
            2. Before Photo Verification
          </dt>
          <dd className="mt-2 text-sm leading-6 text-slate-300">
            Capture high-res timestamped &quot;Before&quot; photos in-app (lawn
            height, unwashed windows, laundry bag count) prior to starting work.
          </dd>
        </div>
        <div className="border-t border-white/20 pt-4">
          <dt className="font-bold text-lime-300">3. Job Execution</dt>
          <dd className="mt-2 text-sm leading-6 text-slate-300">
            Complete service according to CastleCare quality checklists (lawn
            edging, window streak check, wash & fold standards).
          </dd>
        </div>
        <div className="border-t border-white/20 pt-4">
          <dt className="font-bold text-lime-300">
            4. After Photo & Video Proof
          </dt>
          <dd className="mt-2 text-sm leading-6 text-slate-300">
            Upload quick &quot;After&quot; photos and video proof. Photo proof
            is attached directly to customer invoice records.
          </dd>
        </div>
        <div className="border-t border-white/20 pt-4">
          <dt className="font-bold text-lime-300">
            5. Automated Direct Deposit
          </dt>
          <dd className="mt-2 text-sm leading-6 text-slate-300">
            Customer confirmation triggers instant payout release straight to
            your Stripe Connect bank account.
          </dd>
        </div>
        <div className="border-t border-white/20 pt-4">
          <dt className="font-bold text-lime-300">
            6. Customer Review & Tier Progress
          </dt>
          <dd className="mt-2 text-sm leading-6 text-slate-300">
            5-star customer ratings increase your tier rank, unlocking higher
            payout percentages (60/40 ➔ 70/30 ➔ 80/20).
          </dd>
        </div>
      </dl>

      <div className="mx-auto mt-16 max-w-4xl rounded-3xl border border-lime-300/30 bg-lime-300/10 p-6 lg:p-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/30 bg-lime-300/15 px-3 py-1 text-sm font-bold text-lime-200">
            <Sparkles className="size-4 text-lime-300" />
            Performance Progression Tiers
          </span>
          <div className="mt-5 flex items-baseline justify-center gap-2">
            <span className="text-4xl font-extrabold text-white sm:text-5xl">
              70% – 80%
            </span>
            <span className="text-white/60">unlocked</span>
          </div>
          <p className="mt-3 text-base text-slate-300">
            Earn 5-star customer ratings to permanently upgrade your payout
            splits.
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-lime-300/30 bg-[#080c16] p-6">
            <div className="flex items-center gap-1.5 text-sm font-bold text-lime-300">
              <Award className="size-4" />
              Gold Pro
            </div>
            <div className="mt-2 text-4xl font-extrabold text-white">
              70
              <span className="text-2xl font-normal text-white/40"> / 30</span>
            </div>
            <div className="mt-1 text-xs text-white/50">25 jobs & 4.7★</div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Gold Pro (70/30 split): Unlock after 25 jobs & 4.7★ rating.
            </p>
          </div>
          <div className="rounded-2xl border border-lime-300/30 bg-[#080c16] p-6">
            <div className="flex items-center gap-1.5 text-sm font-bold text-lime-300">
              <Zap className="size-4" />
              Elite Pro
            </div>
            <div className="mt-2 text-4xl font-extrabold text-white">
              80
              <span className="text-2xl font-normal text-white/40"> / 20</span>
            </div>
            <div className="mt-1 text-xs text-white/50">75 jobs & 4.9★</div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Elite Pro (80/20 split): Unlock after 75 jobs & 4.9★ rating.
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default EarnWorkflowSpecs;
