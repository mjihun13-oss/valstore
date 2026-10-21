import { useEffect } from 'react';

let locks = 0;
let original = '';

/**
 * 화면 뒤쪽 스크롤 잠금. 여러 창이 겹쳐 열려도 개수를 세어서,
 * 마지막 창이 닫힐 때만 원래대로 돌려놓는다. (스크롤이 먹통이 되는 버그 방지)
 */
export function useScrollLock(active = true): void {
  useEffect(() => {
    if (!active) return;
    if (locks === 0) {
      original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    locks += 1;
    return () => {
      locks = Math.max(0, locks - 1);
      if (locks === 0) document.body.style.overflow = original;
    };
  }, [active]);
}
