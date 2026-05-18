type InternalPageHeroProps = {
  title: string;
  subtitle: string;
};

export function InternalPageHero({ title, subtitle }: InternalPageHeroProps) {
  return (
    <section
      className="relative isolate flex min-h-[260px] items-center justify-center overflow-hidden bg-[#0b080c] px-5 py-14 text-center text-white sm:px-8 md:min-h-[280px] lg:px-10 xl:px-12"
      style={{
        backgroundImage: "url('/internal-hub-bg.svg')",
        backgroundPosition: "center center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/8" aria-hidden />
      <div className="relative mx-auto flex max-w-[980px] flex-col items-center">
        <h1 className="text-4xl font-bold tracking-[-0.035em] text-white sm:text-5xl lg:text-[68px] lg:leading-[1.02]">
          {title}
        </h1>
        <p className="mt-6 max-w-[610px] text-base font-semibold leading-relaxed text-white/90 sm:text-lg">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
