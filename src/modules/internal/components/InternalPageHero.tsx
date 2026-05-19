type InternalPageHeroProps = {
  title: string;
  subtitle: string;
};

export function InternalPageHero({ title, subtitle }: InternalPageHeroProps) {
  return (
    <section
      className="relative isolate flex min-h-[240px] items-center justify-center overflow-hidden bg-[#0b080c] px-4 py-10 text-center text-white sm:px-8 sm:py-14 md:min-h-[280px] lg:px-10 xl:px-12"
      style={{
        backgroundImage: "url('/internal-hub-bg.svg')",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/8" aria-hidden />
      <div className="relative mx-auto flex max-w-[980px] flex-col items-center">
        <h1 className="text-[clamp(2rem,9vw,4.25rem)] font-bold tracking-[-0.035em] text-white leading-[1.08] lg:leading-[1.02]">
          {title}
        </h1>
        <p className="mt-4 max-w-[610px] text-base font-semibold leading-relaxed text-white/90 sm:mt-6 sm:text-lg">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
