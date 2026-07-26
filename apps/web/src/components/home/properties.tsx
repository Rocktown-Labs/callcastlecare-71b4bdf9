import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Building2, Check, Home, Layers } from "lucide-react";
import { useMemo, useState } from "react";

const depositAmountCents = 5000;

const properties = [
  {
    description: "A focused residential plan for compact modern living.",
    features: [
      "Insulated shell",
      "Kitchen and bath ready",
      "Delivery planning",
    ],
    icon: Home,
    id: "residential",
    name: "Residential",
    priceCents: 4_000_000,
  },
  {
    description: "Flexible commercial space for offices, studios, or pop-ups.",
    features: ["High-cube layout", "Electrical planning", "Storefront options"],
    icon: Building2,
    id: "commercial",
    name: "Commercial",
    priceCents: 6_500_000,
  },
  {
    description: "Multi-container layouts for rental or co-living use cases.",
    features: ["Stackable plans", "Separate entries", "Structural review"],
    icon: Layers,
    id: "multi-unit",
    name: "Multi-unit",
    priceCents: 8_500_000,
  },
] as const;

const exteriorColors = [
  { hex: "#f8fafc", id: "white", name: "Standard White", priceCents: 0 },
  { hex: "#475569", id: "slate", name: "Modern Slate", priceCents: 50_000 },
  { hex: "#1e40af", id: "blue", name: "Colonial Blue", priceCents: 70_000 },
  { hex: "#92400e", id: "earth", name: "Earth Tone", priceCents: 50_000 },
] as const;

const formatCurrency = (amountCents: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountCents / 100);

export default function PropertiesSection() {
  const [selectedPropertyId, setSelectedPropertyId] = useState(
    properties[0].id
  );
  const [selectedColorId, setSelectedColorId] = useState(exteriorColors[0].id);

  const selectedProperty = useMemo(
    () =>
      properties.find((property) => property.id === selectedPropertyId) ??
      properties[0],
    [selectedPropertyId]
  );
  const selectedColor = useMemo(
    () =>
      exteriorColors.find((color) => color.id === selectedColorId) ??
      exteriorColors[0],
    [selectedColorId]
  );
  const totalPriceCents =
    selectedProperty.priceCents + selectedColor.priceCents;

  return (
    <section className="bg-[#080c16] py-20" id="homes">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <span className="text-sm font-semibold uppercase text-lime-300">
            Future home services
          </span>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Plan premium property work from the same account
          </h2>
          <p className="mt-4 text-lg leading-8 text-white/60">
            The old app included container home configuration. For this rewrite,
            the public page keeps a clean estimator pattern ready for later API
            pricing and checkout integration.
          </p>

          <div className="mt-8 overflow-hidden border border-white/10 bg-slate-950">
            <img
              alt="CallCastleCare premium home services poster"
              className="aspect-[4/3] w-full object-cover"
              src="/callcastlecare/media/premium-home-services-poster.png"
            />
          </div>
        </div>

        <div className="border border-white/10 bg-white/[0.04] p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {properties.map(({ description, icon: Icon, id, name }) => {
              const isSelected = id === selectedProperty.id;

              return (
                <button
                  className={cn(
                    "border p-4 text-left transition-colors",
                    isSelected
                      ? "border-lime-300/50 bg-lime-300/10"
                      : "border-white/10 bg-slate-950/50 hover:border-white/25"
                  )}
                  key={id}
                  onClick={() => setSelectedPropertyId(id)}
                  type="button"
                >
                  <Icon className="size-5 text-lime-300" />
                  <h3 className="mt-3 font-semibold text-white">{name}</h3>
                  <p className="mt-2 text-xs leading-5 text-white/55">
                    {description}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_240px]">
            <div className="border border-white/10 bg-slate-950/60 p-5">
              <h3 className="text-xl font-bold text-white">
                {selectedProperty.name}
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-white/70">
                {selectedProperty.features.map((feature) => (
                  <li className="flex items-center gap-2" key={feature}>
                    <Check className="size-4 text-lime-300" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {exteriorColors.map(({ hex, id, name, priceCents }) => (
                  <button
                    aria-label={`Choose ${name} exterior color`}
                    className={cn(
                      "flex items-center gap-3 border px-3 py-2 text-left",
                      id === selectedColor.id
                        ? "border-lime-300/50 bg-lime-300/10"
                        : "border-white/10 bg-white/[0.03]"
                    )}
                    key={id}
                    onClick={() => setSelectedColorId(id)}
                    type="button"
                  >
                    <span
                      className="size-5 border border-white/20"
                      style={{ backgroundColor: hex }}
                    />
                    <span>
                      <span className="block text-sm text-white">{name}</span>
                      <span className="text-xs text-white/45">
                        {priceCents === 0
                          ? "Included"
                          : `+${formatCurrency(priceCents)}`}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <aside className="border border-lime-300/30 bg-lime-300/10 p-5">
              <div className="text-sm text-lime-200">Estimated total</div>
              <div className="mt-2 text-3xl font-bold text-white">
                {formatCurrency(totalPriceCents)}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4 text-sm text-white/65">
                Reservation deposit: {formatCurrency(depositAmountCents)}
              </div>
              <Button className="mt-5 w-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200">
                Reserve consult
              </Button>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
