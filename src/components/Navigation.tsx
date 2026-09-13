import { useEffect, useRef, useState } from "react";
export default function Navigation({
  homeLinks = false,
}: {
  homeLinks?: boolean;
}) {
  const homePath = homeLinks ? "/" : "";
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  return (
    <header className="header">
      <div className="wrap nav">
        <a className="brand" href="/" aria-label="Rancher home">
          <svg viewBox="0 0 32 34" fill="none" aria-hidden="true">
            <path
              d="M3 29V6l13-4 13 4v23M3 18l13-4 13 4M10 31V10m12 21V10M3 25l13-4 13 4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          </svg>
          rancher
        </a>
        <button
          type="button"
          ref={button}
          onClick={() => setOpen(!open)}
          className="menu"
          aria-label="Toggle navigation"
          aria-controls="navigation"
          aria-expanded={open}
        >
          ☰
        </button>
        <nav
          className={open ? "navlinks open" : "navlinks"}
          onClick={() => setOpen(false)}
          id="navigation"
          aria-label="Main navigation"
        >
          <a href={`${homePath}#calculator`}>Calculator</a>
          <a href={`${homePath}#use-cases`}>Use cases</a>
          <a href={`${homePath}#how-it-works`}>How it works</a>
          <a href={`${homePath}#protection`}>Your control</a>
          <a href={`${homePath}#contact`} className="btn">
            Explore a partnership <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
