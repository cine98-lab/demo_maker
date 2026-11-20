import { useState } from 'react';
import type { ReactNode } from 'react';
import { ROUTES } from '../routes.ts';
import {
  AppHeader,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  Dialog,
  ProgressBar,
  Segmented,
  SelectField,
  StatusLabel,
  Switch,
  Tabs,
  TextArea,
  TextField,
  Toast,
} from '../components';

function Row({ children, night }: { children: ReactNode; night?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
        padding: night ? 20 : 0,
        borderRadius: 12,
        background: night ? 'var(--night-900)' : undefined,
      }}
    >
      {children}
    </div>
  );
}

/** 공용 컴포넌트 모음 화면 (개발용). 경로: /ui */
export default function UiKit() {
  const [on, setOn] = useState(true);
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [chip, setChip] = useState<'all' | 'shop' | 'book'>('all');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [dialog, setDialog] = useState(false);
  const [big, setBig] = useState(false);
  const [toast, setToast] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)' }}>
      <AppHeader brandTo={ROUTES.main} left={<Badge tone="violet">UI 키트</Badge>} right={<ButtonLink to={ROUTES.main} variant="ghost">랜딩으로 →</ButtonLink>} />
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: '-0.015em' }}>공용 컴포넌트</h1>

        <Card title="Button · ButtonLink">
          <Row>
            <Button variant="primary">주요 행동</Button>
            <Button variant="secondary">보조 행동</Button>
            <Button variant="night">밤하늘</Button>
            <Button variant="ghost">글자만</Button>
            <Button variant="danger">삭제</Button>
            <Button variant="danger-text">회원 탈퇴</Button>
            <Button variant="danger-outline">프로젝트 삭제</Button>
            <Button variant="soft">이 버전으로 되돌리기</Button>
            <Button variant="success-text" size="sm">
              해결 처리
            </Button>
            <Button variant="secondary" square aria-label="더 보기">
              ⋯
            </Button>
            <Button variant="primary" disabled>
              비활성
            </Button>
          </Row>
          <Row>
            <Button variant="primary" size="sm">
              sm 34
            </Button>
            <Button variant="primary" size="md">
              md 40
            </Button>
            <Button variant="primary" size="lg">
              lg 48
            </Button>
            <Button variant="night" pill>
              pill
            </Button>
          </Row>
          <Row>
            <Button variant="kakao" size="lg">
              카카오로 계속하기
            </Button>
            <Button variant="naver" size="lg">
              네이버로 계속하기
            </Button>
          </Row>
          <Row night>
            <ButtonLink to={ROUTES.newProject} variant="primary" size="lg">
              시작하기
            </ButtonLink>
            <ButtonLink to={ROUTES.gallery} variant="violet" size="lg">
              템플릿으로 시작
            </ButtonLink>
          </Row>
        </Card>

        <Card title="Tabs · Segmented">
          <Tabs
            label="예시 탭"
            value={tab}
            onChange={setTab}
            items={[
              { id: 'a', label: '일반' },
              { id: 'b', label: '버전 기록' },
              { id: 'c', label: '내보내기' },
            ]}
          />
          <Tabs
            label="예시 칩"
            variant="chip"
            value={chip}
            onChange={setChip}
            items={[
              { id: 'all', label: '전체', count: 8 },
              { id: 'shop', label: '쇼핑몰' },
              { id: 'book', label: '예약' },
            ]}
          />
          <div style={{ maxWidth: 300 }}>
            <Tabs
              label="채우기 탭"
              variant="pill"
              fill
              size="sm"
              value={tab}
              onChange={setTab}
              items={[
                { id: 'a', label: '페이지' },
                { id: 'b', label: '블록' },
                { id: 'c', label: '테마' },
              ]}
            />
          </div>
          <Row>
            <Segmented
              label="기기 너비"
              value={device}
              onChange={setDevice}
              options={[
                { value: 'desktop', label: '데스크톱' },
                { value: 'tablet', label: '태블릿' },
                { value: 'mobile', label: '모바일' },
              ]}
            />
          </Row>
        </Card>

        <Card title="입력">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <TextField label="프로젝트 이름" defaultValue="동네 반찬 공동구매" />
            <TextField label="이름" optional placeholder="비워두면 익명으로 남아요" hint="댓글 옆에 보여요" />
            <TextField label="공유 링크" readOnly value="banchan-nanum.demomaker.app" />
            <TextField label="이메일" defaultValue="seoyeon@" error="이메일 형식을 확인해 주세요" />
            <SelectField label="연결할 페이지" defaultValue="detail">
              <option value="home">홈</option>
              <option value="detail">상품 상세</option>
            </SelectField>
            <TextArea label="의견" placeholder="이 부분에 대해 느낀 점을 적어주세요" />
            <SelectField label="정렬" inline size="sm" defaultValue="recent">
              <option value="recent">최근 수정순</option>
              <option value="name">이름순</option>
            </SelectField>
          </div>
          <Row night>
            <SelectField label="페이지" night inline size="sm" defaultValue="home">
              <option value="home">홈</option>
              <option value="detail">상품 상세</option>
            </SelectField>
            <TextField label="AI에게 부탁하기" night inline size="sm" placeholder="버튼을 더 크게 해줘" />
          </Row>
          <Row>
            <span id="kit-switch" style={{ fontSize: 15 }}>
              피드백 받기
            </span>
            <Switch checked={on} onChange={setOn} aria-labelledby="kit-switch" />
          </Row>
        </Card>

        <Card title="배지 · 상태 · 진행 · 아바타">
          <Row>
            <Badge tone="coral">쇼핑몰</Badge>
            <Badge tone="success">배포됨</Badge>
            <Badge tone="neutral">초안</Badge>
            <Badge tone="night">새 피드백 3</Badge>
            <Badge tone="gold">★ 추천</Badge>
            <Badge tone="violet">커뮤니티</Badge>
          </Row>
          <Row>
            <StatusLabel tone="success">연결됨</StatusLabel>
            <StatusLabel tone="muted">초안</StatusLabel>
            <StatusLabel tone="danger">오류</StatusLabel>
          </Row>
          <ProgressBar value={80} label="모집 현황" />
          <ProgressBar value={45} decorative color="var(--success)" />
          <Row>
            <Avatar name="김서연" size={64} ring />
            <Avatar name="민지" />
            <Avatar name="하람" size={28} />
          </Row>
        </Card>

        <Card title="Dialog · Toast">
          <Row>
            <Button variant="danger" onClick={() => setDialog(true)}>
              삭제 확인 창 열기
            </Button>
            <Button variant="night" onClick={() => setToast('저장됨')}>
              알림 띄우기
            </Button>
            <Button variant="secondary" onClick={() => setBig(true)}>
              큰 미리보기 창 열기
            </Button>
          </Row>
        </Card>
      </main>

      <Dialog
        open={dialog}
        onClose={() => setDialog(false)}
        alert
        title="이 별자리를 지울까요?"
        actions={
          <>
            <Button onClick={() => setDialog(false)}>취소</Button>
            <Button variant="danger" onClick={() => setDialog(false)}>
              삭제
            </Button>
          </>
        }
      >
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: 'var(--ink-muted)' }}>되돌릴 수 없어요.</p>
      </Dialog>
      <Dialog
        open={big}
        onClose={() => setBig(false)}
        size="lg"
        title="동네 반찬 공동구매"
        header={{
          lead: <Badge tone="coral">쇼핑몰</Badge>,
          actions: (
            <Button variant="secondary" size="sm" onClick={() => setBig(false)}>
              닫기
            </Button>
          ),
        }}
      >
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-muted)' }}>미리보기 내용</div>
      </Dialog>
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
