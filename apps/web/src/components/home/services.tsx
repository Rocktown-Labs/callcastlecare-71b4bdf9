import { Button } from "@callcastlecare/ui/components/button";
import { Link } from "@tanstack/react-router";
import { Check, Shirt, Sprout, WandSparkles } from "lucide-react";

const services = [
  {
    description:
      "Clean, trimmed, and reliable lawn care for standard lots, medium lots, and commercial properties.",
    features: ["Mowing", "Edge trimming", "Debris cleanup"],
    icon: Sprout,
    image: "/callcastlecare/media/lawn-care-rider-night.png",
    name: "Lawn care",
    price: "From $75",
  },
  {
    description:
      "Wash, fold, pickup, and delivery for households that want laundry handled without losing the day.",
    features: ["Wash and fold", "Stain treatment", "Pickup and delivery"],
    icon: Shirt,
    image: "/callcastlecare/media/laundry-pickup-van.png",
    name: "Laundry",
    price: "From $35",
  },
  {
    description:
      "Trusted home service visits for the small jobs and specialist calls that keep a home running.",
    features: ["Service visits", "Photo proof", "Clear status updates"],
    icon: WandSparkles,
    image: "/callcastlecare/media/home-technician-control-panel.png",
    name: "Home services",
    price: "$50 deposit",
  },
] as const;

export default function ServicesSection() {
  return (
    <section className="bg-white py-20 text-slate-950" id="services">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Premium care without the coordination headache
          </h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Start with a simple request. CallCastleCare handles the service
            details, provider coordination, and status visibility.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {services.map(
            ({ description, features, icon: Icon, image, name, price }) => (
              <article
                className="overflow-hidden border border-slate-200 bg-slate-50"
                key={name}
              >
                <div className="relative aspect-[4/3] bg-slate-900">
                  <img
                    alt={`${name} service`}
                    className="absolute inset-0 size-full object-cover"
                    src={image}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center bg-slate-950 text-lime-300">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="text-xl font-bold">{name}</h3>
                    </div>
                    <span className="text-sm font-semibold text-slate-500">
                      {price}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    {description}
                  </p>
                  <ul className="mt-5 space-y-2 text-sm text-slate-700">
                    {features.map((feature) => (
                      <li className="flex items-center gap-2" key={feature}>
                        <Check className="size-4 text-lime-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/login">
                    <Button className="mt-6 w-full bg-slate-950 text-white hover:bg-slate-800">
                      Book {name.toLowerCase()}
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
