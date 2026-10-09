
const logoUrl = "/api/public/logo";

export function CscLogo({ className = "size-10" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Computer Science Clique logo"
      width={512}
      height={512}
      className={`${className} shrink-0 rounded-full object-cover`}
    />
  );
}
