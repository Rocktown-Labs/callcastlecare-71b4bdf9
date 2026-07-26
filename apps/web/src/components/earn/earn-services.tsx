import { Button } from "@callcastlecare/ui/components/button";
import { ArrowRight, Box, HardHat, Scissors } from "lucide-react";

const services = [
  {
    color: "text-sky-300",
    description:
      "We supply the custom bags. You need a car, a smartphone, and reliable access to a washer and dryer.",
    icon: Box,
    id: "laundry",
    image: "/callcastlecare/media/laundry-pickup-van.png",
    requirements: ["Vehicle", "Smartphone", "Washer and dryer access"],
    title: "Laundry courier and processor",
  },
  {
    color: "text-lime-300",
    description:
      "Turn your equipment into a business, from push mower jobs to larger estate work with commercial gear.",
    icon: Scissors,
    id: "lawncare",
    image: "/callcastlecare/media/lawn-care-rider-night.png",
    requirements: ["Vehicle", "Push or ride-on mower", "Edger or trimmer"],
    title: "Lawn care professional",
  },
  {
    color: "text-amber-300",
    description:
      "Handle premium home service calls for customers who need trusted, well-documented work.",
    icon: HardHat,
    id: "homes",
    image: "/callcastlecare/media/home-technician-control-panel.png",
    requirements: ["Trade experience", "Apprentices welcome", "Tools of trade"],
    title: "Home services and trades",
  },
] as const;

export default function EarnServices() {
  return (
    <section className="bg-[#080c16] py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Choose your lane
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/60">
            Whether you want flexible side income or a full-time service
            business, CallCastleCare gives you a path to get moving.
          </p>
        </div>

        <div className="flex snap-x gap-5 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3">
          {services.map(
            ({
              color,
              description,
              icon: Icon,
              id,
              image,
              requirements,
              title,
            }) => (
              <article
                className="flex w-[84vw] shrink-0 snap-center flex-col overflow-hidden border border-white/10 bg-slate-950/70 md:w-auto"
                key={id}
              >
                <div className="relative aspect-[4/3] border-b border-white/10 bg-slate-950">
                  <img
                    alt={`${title} opportunity`}
                    className="absolute inset-0 size-full object-cover"
                    src={image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080c16] to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center border border-white/10 bg-white/[0.04]">
                      <Icon className={`size-5 ${color}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                  </div>

                  <p className="flex-1 text-sm leading-6 text-white/60">
                    {description}
                  </p>

                  <div className="mt-6 space-y-3">
                    <span className="text-xs font-semibold uppercase text-white/40">
                      You need
                    </span>
                    <ul className="space-y-2 text-sm text-white/80">
                      {requirements.map((requirement) => (
                        <li
                          className="flex items-center gap-2"
                          key={requirement}
                        >
                          <span className="size-1.5 bg-lime-300" />
                          {requirement}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button className="mt-6 h-11 w-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                    Apply now
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}
