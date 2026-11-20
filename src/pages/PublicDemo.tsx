import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isDemoSlug } from '../data/demos.ts';
import type { DemoSlug } from '../routes.ts';
import { siteFromDemo } from '../lib/generator.ts';
import { DemoShell } from '../site/DemoShell.tsx';
import NotFound from './NotFound.tsx';

/** 기본 예시 데모 (/demo/:slug). 피드백·좋아요는 이 화면 안에서만 흉내 낸다 (저장하지 않음). */
export default function PublicDemo() {
  const { slug } = useParams<{ slug: string }>();
  if (!isDemoSlug(slug)) return <NotFound />;
  return <ExampleDemo key={slug} slug={slug} />;
}

/** 예시 데모의 처음 좋아요 수 (slug 마다 고정) */
function baseLikes(slug: string): number {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return 8 + (h % 17);
}

function ExampleDemo({ slug }: { slug: DemoSlug }) {
  const site = useMemo(() => siteFromDemo(slug), [slug]);
  const [page, setPage] = useState(site.pages[0]?.id ?? 'home');
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const prev = document.title;
    document.title = `${site.brand} · 데모메이커`;
    return () => {
      document.title = prev;
    };
  }, [site.brand]);

  return (
    <DemoShell
      site={site}
      pageId={page}
      onNavigate={setPage}
      feedbackEnabled
      likes={baseLikes(slug) + (liked ? 1 : 0)}
      liked={liked}
      onToggleLike={() => setLiked((v) => !v)}
      onSubmitFeedback={async () => {
        /* 예시 데모: 저장하지 않고 성공만 보여준다 */
      }}
    />
  );
}
