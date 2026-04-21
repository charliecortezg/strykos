import { UNIFORM_PUBLIC_BASE_URL } from '@/lib/uniform-utils';

export function getCheerPublicUrl(token: string) {
  return `${UNIFORM_PUBLIC_BASE_URL}/porra/${token}`;
}
