import { Link } from "@tanstack/react-router";
import { Camera, MessageCircle, Share2 } from "lucide-react";
import type { ReactNode } from "react";

const footerLinks = {
  company: ["About", "Careers", "Press", "Blog"],
  legal: ["Privacy", "Terms", "Cookies"],
  services: [
    { href: "/services/lawncare", label: "Lawn care" },
    { href: "/services/laundry", label: "Laundry" },
    { href: "/services/window-washing", label: "Window washing" },
    { href: "/earn", label: "Drive for us" },
  ],
  support: ["Help Center", "Contact", "Service Areas", "FAQ"],
} as const;

const socialLinks = [
  { icon: Share2, label: "Social updates" },
  { icon: Camera, label: "Service photos" },
  { icon: MessageCircle, label: "Community" },
] as const;

const FooterColumn = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <div>
    <h2 className="mb-4 text-xs font-semibold uppercase text-white/80">
      {title}
    </h2>
    <div className="grid gap-2.5 text-sm text-white/45 [&_a]:transition-colors [&_a:hover]:text-lime-300">
      {children}
    </div>
  </div>
);

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#080c16]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link aria-label="CallCastleCare home" to="/">
              <img
                alt="CallCastleCare"
                className="h-16 w-auto"
                src="/callcastlecare/brand/logo-square-200.png"
              />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-white/45">
              Premium home services on demand. Lawn care, laundry, and window
              washing for busy Central Arkansas households.
            </p>
            <div className="mt-6 flex gap-2">
              {socialLinks.map(({ icon: Icon, label }) => (
                <button
                  aria-label={label}
                  className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition-colors hover:border-lime-300/40 hover:text-lime-300"
                  key={label}
                  type="button"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>

          <FooterColumn title="Services">
            {footerLinks.services.map(({ href, label }) => (
              <a href={href} key={label}>
                {label}
              </a>
            ))}
          </FooterColumn>
          <FooterColumn title="Company">
            {footerLinks.company.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </FooterColumn>
          <FooterColumn title="Support">
            {footerLinks.support.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </FooterColumn>
          <FooterColumn title="Legal">
            {footerLinks.legal.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-3 border-t border-white/5 pt-6 text-xs text-white/30 md:flex-row">
          <p>&copy; {new Date().getFullYear()} CallCastleCare.</p>
          <a
            className="transition-colors hover:text-lime-300"
            href="https://www.rocktownlabs.com"
            rel="noreferrer"
            target="_blank"
          >
            A product of Rocktown Labs
          </a>
        </div>
      </div>
    </footer>
  );
}
