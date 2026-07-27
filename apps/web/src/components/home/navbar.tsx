import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { ChevronDown, Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { serviceCatalog } from "@/lib/service-catalog";

const sectionLinks = [
  { href: "/#services", label: "Services", sectionId: "services" },
] as const;

export default function Navbar() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const toggleMenu = useCallback(() => setIsMenuOpen((open) => !open), []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);

      let current = "";
      for (const { sectionId } of sectionLinks) {
        const element = document.querySelector(`#${sectionId}`);
        const elementTop = element?.getBoundingClientRect().top;
        if (elementTop !== undefined && elementTop <= 180) {
          current = sectionId;
        }
      }
      setActiveSection(current);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-colors",
        isScrolled
          ? "border-white/10 bg-[#080c16]/90 backdrop-blur"
          : "border-transparent bg-[#080c16]/75"
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link
            aria-label="CallCastleCare home"
            className="flex items-center"
            to="/"
          >
            <img
              alt="CallCastleCare"
              className="h-16 w-auto sm:h-18"
              src="/callcastlecare/brand/logo-square-200.png"
            />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <div className="group relative">
              <a
                className={cn(
                  "inline-flex items-center gap-1.5 text-sm font-medium text-white/75 transition-colors hover:text-lime-300 focus-visible:text-lime-300",
                  pathname.startsWith("/services") ||
                    (pathname === "/" &&
                      activeSection === sectionLinks[0].sectionId)
                    ? "text-lime-300"
                    : ""
                )}
                href={sectionLinks[0].href}
              >
                Services
                <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
              </a>
              <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4 opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-2xl shadow-slate-950/50 backdrop-blur">
                  {serviceCatalog.map((service) => {
                    const Icon = service.icon;

                    return (
                      <Link
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
                        key={service.id}
                        params={{ serviceId: service.id }}
                        to="/services/$serviceId"
                      >
                        <Icon className="size-4 text-lime-300" />
                        <span>
                          <span className="block font-semibold">
                            {service.shortName}
                          </span>
                          <span className="text-xs text-white/40">
                            {service.badge}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
            <Link
              className={cn(
                "text-sm font-medium text-white/75 transition-colors hover:text-lime-300",
                pathname === "/earn" && "text-lime-300"
              )}
              to="/earn"
            >
              Earn
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login">
              <Button
                className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/10"
                variant="outline"
              >
                Log in
              </Button>
            </Link>
            <Link search={{}} to="/book">
              <Button className="rounded-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200">
                Get started
              </Button>
            </Link>
          </div>

          <Button
            aria-expanded={isMenuOpen}
            aria-label="Toggle menu"
            className="text-white md:hidden"
            onClick={toggleMenu}
            size="icon"
            variant="ghost"
          >
            {isMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </Button>
        </div>

        {isMenuOpen ? (
          <div className="border-t border-white/10 py-4 md:hidden">
            <nav className="grid gap-3">
              <a
                className="text-base font-medium text-white/80"
                href={sectionLinks[0].href}
                onClick={closeMenu}
              >
                Services
              </a>
              {serviceCatalog.map((service) => (
                <Link
                  className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/70"
                  key={service.id}
                  onClick={closeMenu}
                  params={{ serviceId: service.id }}
                  to="/services/$serviceId"
                >
                  {service.shortName}
                </Link>
              ))}
              <Link
                className="text-base font-medium text-white/80"
                onClick={closeMenu}
                to="/earn"
              >
                Earn
              </Link>
              <Link onClick={closeMenu} search={{}} to="/book">
                <Button className="mt-2 w-full rounded-full bg-lime-300 font-semibold text-slate-950 hover:bg-lime-200">
                  Get started
                </Button>
              </Link>
            </nav>
          </div>
        ) : null}
      </div>
    </header>
  );
}
