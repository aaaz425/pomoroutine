import { Focus, BookOpen, BarChart2 } from 'lucide-react';
import Image from 'next/image';

const FEATURES = [
  {
    icon: Focus,
    title: '집중 모드로 몰입',
    desc: '필요한 것만 남기고 나머지는 사라집니다\n타이머와 지금 할 일에만 온전히 집중하세요',
    src: '/landing/focus-mode.png',
    alt: '집중 모드 화면',
    width: 2940,
    height: 1602,
  },
  {
    icon: BookOpen,
    title: '집중 회고 메모',
    desc: '집중이 끝날 때마다 짧게 기록을 남기세요\n작은 회고가 성장의 흔적이 됩니다',
    src: '/landing/journal.png',
    alt: '기록 화면',
    width: 2940,
    height: 1602,
  },
  {
    icon: BarChart2,
    title: '한눈에 보는 집중 통계',
    desc: '카테고리별 집중 시간부터 연속 기록까지, 대시보드에서 나의 흐름을 확인하세요',
    src: '/landing/dashboard.png',
    alt: '통계 대시보드 화면',
    width: 2940,
    height: 1602,
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="flex flex-col items-center text-center gap-3 mb-12">
          <span className="text-xs font-medium text-primary uppercase tracking-wider">기능</span>
          <h2 className="text-3xl font-bold text-foreground">몰입하고, 기록하고, 분석하세요</h2>
          <p className="text-muted-foreground text-sm max-w-md break-keep">
            단순한 타이머를 넘어, 집중의 흐름을 기록하고 분석합니다
          </p>
        </div>
        <div className="flex flex-col gap-20">
          {FEATURES.map(({ icon: Icon, title, desc, src, alt, width, height }, i) => (
            <div
              key={title}
              className={`flex flex-col sm:flex-row items-center gap-8 sm:gap-12 ${
                i % 2 === 1 ? 'sm:flex-row-reverse' : ''
              }`}
            >
              <Image
                src={src}
                alt={alt}
                width={width}
                height={height}
                className="w-full sm:w-1/2 h-auto rounded-xl border border-border"
                sizes="(min-width: 640px) 50vw, 100vw"
              />
              <div className="sm:w-1/2 flex flex-col gap-2">
                <Icon className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed break-keep whitespace-pre-line">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
