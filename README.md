# 데모메이커 (UI)

아이디어를 눈앞의 데모 사이트로 보여주고, 함께 피드백하며 키워가는 서비스 **데모메이커**의 화면 코드입니다.
디자인 콘셉트는 "별자리" — 흩어진 점(꿈)이 선(연결)으로 이어져 별자리(가치)가 되는 과정입니다.

> **현재 단계: 기능 개발 1차.** 로그인·저장·배포·피드백이 **Supabase** 로 동작합니다.
> AI 생성은 아직 규칙 기반 생성기(`src/lib/generator.ts`)이며, 나중에 Edge Function + AI 로 바꿀 수 있게 나눠 두었습니다.

## Supabase 설정 (처음 한 번)

1. `.env.example` 을 `.env.local` 로 복사하고 Project URL, anon(publishable) key 를 넣습니다.
2. Supabase 대시보드 → **SQL Editor** 에서 `supabase/migrations/20261120000000_init.sql` 전체를 실행합니다.
   테이블(profiles, projects, project_versions, feedback, likes), 보안 규칙(RLS), 방문자용 함수(RPC), 사진 저장소(project-assets)가 만들어집니다.
3. (선택) Authentication → Providers 에서 **Google / Kakao** 를 켜면 소셜 로그인 버튼이 동작합니다.
   Redirect URL 에 `http://localhost:5173/login` (배포 후엔 실제 도메인)을 추가하세요.
4. (선택) 개발 중엔 Authentication → Email 의 **Confirm email** 을 끄면 가입 즉시 로그인됩니다.
5. 비밀번호 재설정 메일이 돌아올 주소로 `http://localhost:5173/reset-password` 를 Redirect URL 에 추가하세요.

## 기능

| 영역 | 동작 |
|---|---|
| 로그인 | 이메일 가입/로그인, 이메일 인증 안내, 비밀번호 재설정, Google·Kakao(설정 시), 로그인 필요한 화면 보호 |
| 가입 없이 시작 | 로그인 전 만든 초안은 이 브라우저에 저장(`/project/draft/...`), 로그인하면 계정 프로젝트로 자동 이동 |
| 새 프로젝트 | 아이디어 / 질문형 마법사 / 템플릿 → 생성 애니메이션 → 프로젝트 저장 |
| 구조 확인 | 페이지(별) 추가·삭제·이름·내용 편집, 제안 페이지 수락/거절, 자동 저장 |
| 에디터 | 문구·가격·버튼·색·목록·페이지 편집, 대표 사진 업로드, 되돌리기/다시하기, 저장 시 버전 기록, 간단한 AI 명령 |
| 미리보기 | 기기 너비별 미리보기, 페이지 이동 |
| 배포 | 주소(slug), 공개 범위(전체/링크/비밀번호), 피드백 받기, 공유 링크 복사, QR 코드 |
| 공개 데모 `/p/:slug` | 방문자 피드백 핀·의견·설문, 좋아요, 비밀번호 보호 |
| 피드백 보기 | 상태·페이지 필터, 해결 처리, 삭제, 핀 위치 표시, 통계 |
| 대시보드 | 내 프로젝트, 검색·정렬, 열린 피드백 수, 복제·삭제 |
| 프로젝트 설정 | 이름, 버전 기록·되돌리기, JSON/HTML 내보내기, 복제, 삭제 |
| 계정 | 이름, 알림 설정, 비밀번호 변경, 로그아웃, 회원 탈퇴 |

**보안**: 프로젝트 데이터는 주인만 읽고 씁니다(RLS). 방문자는 배포 여부·비밀번호·피드백 허용을 확인하는 함수로만 데모를 읽고 피드백/좋아요를 남깁니다. 비밀번호는 해시(bcrypt)로만 저장합니다.

## 실행

Node.js 18 이상이 필요합니다. (https://nodejs.org 에서 LTS 설치)

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:5173)
npm run build    # 타입 검사 + 배포용 빌드
```

## 화면과 경로

| 경로 | 화면 | 시안 파일 |
|---|---|---|
| `/` | 랜딩 페이지 | Main.dc.html |
| `/templates` | 템플릿 갤러리 | Gallery.dc.html |
| `/new` | 새 프로젝트 만들기 | NewProject.dc.html |
| `/new/generating` | AI 생성 로딩 | Generating.dc.html |
| `/login` | 로그인 / 회원가입 | Login.dc.html |
| `/dashboard` | 대시보드 | Dashboard.dc.html |
| `/project/structure` | 구조 확인 | Structure.dc.html |
| `/project/editor` | 에디터 | Editor.dc.html |
| `/project/preview` | 미리보기 모드 | Preview.dc.html |
| `/project/published` | 배포 완료 | Published.dc.html |
| `/project/feedback` | 피드백 보기 | Feedback.dc.html |
| `/project/settings` | 프로젝트 설정 | Settings.dc.html |
| `/account` | 계정 설정 | Account.dc.html |
| `/demo/:slug` | 공개 데모 (banchan, bookstore, pottery, study, camping, cafe, walk) | PublicDemo.dc.html, Demo*.dc.html |

## 폴더 구조

```
demo_maker/
├─ design/                 디자인 원본 (참고용, 빌드에 포함되지 않음)
│  ├─ design-system/       디자인 시스템 토큰과 브랜드 가이드
│  └─ screens/             화면 시안 (.dc.html) 과 캔버스 배치
├─ public/images/          이미지 (장조림 사진 등)
└─ src/
   ├─ styles/              디자인 토큰(CSS 변수)과 전역 스타일
   ├─ components/          공용 컴포넌트
   ├─ data/                화면에 쓰는 예시 데이터
   ├─ pages/               화면 컴포넌트 (경로당 하나)
   ├─ routes.ts            경로 상수
   └─ App.tsx              라우터
```

## 공용 컴포넌트

`src/components` 에 있고 `import { Button, Card } from '../components'` 로 씁니다.
개발 서버에서 **`/ui`** 경로를 열면 모든 컴포넌트를 한 화면에서 볼 수 있습니다.

| 컴포넌트 | 쓰임 |
|---|---|
| `Button` / `ButtonLink` | 동작 버튼 / 화면 이동 버튼. variant: primary · soft · secondary · night · violet · ghost · danger · danger-outline · danger-text · success-text · kakao · naver, size: sm · md · lg, pill · block · square, ref 전달 |
| `Tabs` | 탭 목록 (underline · pill · chip), fill(균등 너비), size sm, 화살표 키 이동 |
| `Segmented` | 하나 고르기 (기기 너비 등), 라디오 그룹 |
| `Switch` | 켜고 끄기 |
| `Card` | 흰 면 + 테두리 섹션 (night 변형) |
| `TextField` · `TextArea` · `SelectField` | 라벨이 붙은 입력 (선택 표시, 도움말, 오류), inline(옆 라벨) · night · size sm |
| `Badge` · `StatusLabel` | 분류 꼬리표 / 점 + 상태 글자 |
| `ProgressBar` | 진행 막대 |
| `Avatar` | 이름 첫 글자 원 |
| `Dialog` | 모달 (Esc, 포커스 가두기, 닫으면 포커스 복귀), 큰 창용 header(lead · actions) |
| `Toast` | 잠깐 뜨는 알림 (자동 사라짐), offset 으로 위치 조정 |
| `AppHeader` · `Brand` · `LogoMark` | 상단 바, 로고 (Brand 는 링크 없이도 사용) |

스타일은 `src/components/ui.css` 하나에 모여 있고 색은 `tokens.css` 변수만 씁니다.

## 애니메이션 (GSAP)

`src/animation` 에 모여 있습니다. GSAP 3.13 의 **ScrollSmoother** 로 사이트 전체 스크롤을 부드럽게 하고,
화면 요소에 `data-*` 표시만 붙이면 스크롤에 따른 패럴랙스·등장 효과가 붙습니다.

```tsx
const root = useRef<HTMLDivElement>(null);
useScrollMotion(root);           // 화면 컴포넌트 맨 위에서 한 번
return <div ref={root}> ... </div>;
```

| 표시 | 효과 |
|---|---|
| `data-speed="0.8"` / `"1.15"` / `"auto"` | 스크롤보다 느리게(먼 배경) / 빠르게(앞 장식) / 부모 안에서 이미지가 흐름 |
| `data-lag="0.3"` | 스크롤을 살짝 늦게 따라옴 |
| `data-reveal` (`left` · `right` · `scale` · `fade`) | 화면에 들어올 때 떠오르며 나타남 |
| `data-reveal-stagger` | 자식들이 차례로 나타남 (카드 목록) |
| `data-parallax="8"` | 지나가는 동안 위아래로 흐름 (사진 안쪽) |
| `data-drift="-40"` | 지나가는 동안 y 이동 |
| `data-intro` | 화면이 열릴 때 차례로 등장 |
| `<Starfield />` | 밤하늘 섹션 뒤의 3겹 별 무리 (깊이마다 다른 속도) |

**주의**
- 부드러운 스크롤 안에서는 `position: fixed` / `sticky` 가 동작하지 않습니다. 화면에 고정할 것은 `<Portal>` 로 감싸 `position: fixed` 로 그립니다 (Toast, Dialog 는 이미 처리됨).
- OS 의 "동작 줄이기" 설정이 켜져 있으면 부드러운 스크롤과 모든 스크롤 애니메이션이 꺼지고 기본 스크롤로 동작합니다.
- 에디터·미리보기·AI 생성 화면은 작업 도구라서 스크롤 애니메이션을 넣지 않았습니다.

## 다음 단계

- AI 생성: `generateSite()` 를 Supabase Edge Function + AI API 호출로 교체
- 피드백 알림 메일 (profiles.notify_feedback 사용), 방문자 피드백 남용 방지(요청 제한)
- 소셜 계정 연결(이미 가입한 계정에 Google/Kakao 추가), 네이버 로그인
