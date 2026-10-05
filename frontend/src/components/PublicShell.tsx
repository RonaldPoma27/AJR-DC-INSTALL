import Logo from "@/components/layout/Logo";
import ThemeToggle from "@/components/layout/ThemeToggle";

/** Marco sin sesión (login, registro, ficha pública del QR). */
export default function PublicShell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-white/10 bg-ink text-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo to="/" />
          <ThemeToggle />
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:py-16 ${wide ? "max-w-2xl" : "max-w-md"}`}>{children}</main>
    </div>
  );
}
