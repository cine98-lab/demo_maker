import { useNavigate } from 'react-router-dom';
import { Button, Dialog } from '../../components';
import { ROUTES, loginPath } from '../../routes.ts';

/**
 * 로그인 전 초안에서 "배포"를 눌렀을 때.
 * 로그인하면 Login 화면이 초안을 계정으로 옮기고 새 프로젝트의 에디터를 연다.
 */
export function DraftLoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="배포하려면 로그인이 필요해요"
      actions={
        <>
          <Button onClick={onClose}>계속 편집하기</Button>
          <Button variant="primary" onClick={() => navigate(loginPath(ROUTES.editor('draft')))}>
            로그인하고 계속하기
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7 }}>
        지금까지 만든 초안은 이 브라우저에 저장돼 있어요. 로그인하면 계정으로 그대로 옮겨지고, 이어서 배포할 수 있어요.
      </p>
    </Dialog>
  );
}
