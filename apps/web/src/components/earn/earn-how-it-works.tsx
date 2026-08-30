import { Camera, CheckCircle, MapPin, Route, Zap } from "lucide-react";

const steps = [
  {
    description:
      "Customer bookings in your preferred zip code are batched into 2-hour route blocks (Amazon Flex style) and dispatched directly to your mobile app.",
    icon: Route,
    step: "01",
    title: "Route Dispatch",
  },
  {
    description:
      "Arrive at the customer's property during their scheduled 2-hour arrival window and tap 'Arrived' to start the active job timer.",
    icon: MapPin,
    step: "02",
    title: "On-Site Check-In",
  },
  {
    description:
      "Before starting work and after finishing, take clear before-and-after photos and short video clips directly in the app to document quality.",
    icon: Camera,
    step: "03",
    title: "Photo & Video Verification",
  },
  {
    description:
      "Once verified by system AI and customer approval, your payout split (60% to 80%) is immediately released to your linked bank account.",
    icon: Zap,
    step: "04",
    title: "Instant Payout Release",
  },
] as const;

export default function EarnHowItWorks() {
  return (
    <section className="border-t border-white/5 bg-slate-950 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-4 py-1.5 text-xs font-bold tracking-widest text-lime-300 uppercase">
            <CheckCircle className="size-4" />
            Field Provider Workflow
          </div>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            How Dispatch & Quality Verification Work
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/60">
            From neighborhood route dispatch to before-and-after photo/video
            proof, here is how CastleCare Pros deliver 5-star service and get
            paid fast.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ description, icon: Icon, step, title }) => (
            <article
              className="relative flex flex-col rounded-3xl border border-white/10 bg-[#080c16] p-6 transition-all duration-200 hover:border-lime-300/40 hover:bg-slate-900/60"
              key={step}
            >
              <div className="flex items-center justify-between">
                <span className="flex size-12 items-center justify-center rounded-2xl border border-lime-300/20 bg-lime-300/10 text-lime-300">
                  <Icon className="size-6" />
                </span>
                <span className="text-2xl font-black tracking-wider text-white/20">
                  {step}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
