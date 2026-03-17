export const UNIFORM_PUBLIC_BASE_URL = 'https://strykos.lovable.app';

export function getUniformPublicUrl(token: string) {
  return `${UNIFORM_PUBLIC_BASE_URL}/uniforme/${token}`;
}
