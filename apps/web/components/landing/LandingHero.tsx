import { LandingCTA } from '@/components/landing/LandingCTA';

interface Props {
  isLoggedIn: boolean;
}

export function LandingHero({ isLoggedIn }: Props) {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 flex flex-col items-center text-center gap-6">
      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground max-w-2xl leading-tight">
        작은 집중이 쌓여
        <br />
        습관이 됩니다
      </h1>
      <p className="text-base sm:text-lg text-muted-foreground max-w-md leading-relaxed break-keep">
        포모도로 타이머로 집중하고, 기록하고, 분석하세요
        <br />
        매일의 노력이 쌓여 결과로 이어집니다
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {isLoggedIn ? (
          <LandingCTA href="/" label="시작하기" />
        ) : (
          <>
            <LandingCTA href="/" label="체험하기" />
            <LandingCTA href="/login" label="로그인" variant="secondary" />
          </>
        )}
      </div>
    </section>
  );
}
