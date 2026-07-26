import { Button } from "@callcastlecare/ui/components/button";
import { cn } from "@callcastlecare/ui/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
        if (element?.getBoundingClientRect().top <= 180) {
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
        <div className="flex h-18 items-center justify-between">
          <Link
            aria-label="CallCastleCare home"
            className="flex items-center"
            to="/"
          >
            <img
              alt="CallCastleCare"
              className="h-11 w-auto"
              src="/callcastlecare/brand/logo-square-200.png"
            />
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            {sectionLinks.map(({ href, label, sectionId }) => (
              <a
                className={cn(
                  "text-sm font-medium text-white/75 transition-colors hover:text-lime-300",
                  pathname === "/" &&
                    activeSection === sectionId &&
                    "text-lime-300"
                )}
                href={href}
                key={sectionId}
              >
                {label}
              </a>
            ))}
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
              {sectionLinks.map(({ href, label }) => (
                <a
                  className="text-base font-medium text-white/80"
                  href={href}
                  key={label}
                  onClick={closeMenu}
                >
                  {label}
                </a>
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
