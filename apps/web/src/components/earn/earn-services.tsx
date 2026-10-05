import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";
import { ArrowRight, Box, Grid2x2, Scissors } from "lucide-react";

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
    title: "Lawn Care professional",
  },
  {
    color: "text-cyan-300",
    description:
      "Clean exterior glass, inside-and-out upgrades, and screens with clear photo documentation.",
    icon: Grid2x2,
    id: "window-washing",
    image: "/callcastlecare/media/window-washing-hero.png",
    requirements: ["Reliable vehicle", "Window tools", "Ladder safety"],
    title: "Window Washing professional",
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
            business, CastleCare gives you a path to get moving.
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
                className="flex w-[84vw] shrink-0 snap-center flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 md:w-auto"
                key={id}
              >
                <div className="relative aspect-[4/3] border-b border-white/10 bg-slate-950">
                  <Image
                    alt={`${title} opportunity`}
                    aspectRatio={4 / 3}
                    className="absolute inset-0 size-full object-cover"
                    layout="fullWidth"
                    src={image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#080c16] to-transparent" />
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
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
                          <span className="size-1.5 rounded-full bg-lime-300" />
                          {requirement}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link className="mt-6" to="/sign-in">
                    <Button className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] text-white hover:bg-white/10">
                      Apply now
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </Link>
                </div>
              </article>
            )
          )}
        </div>
      </div>
    </section>
  );
}
