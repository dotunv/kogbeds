import { Publication } from '@prisma/client';

export type TenantType = 'root' | 'subdomain' | 'custom_domain';

export interface TenantContext {
  type: TenantType;
  publication: Publication | null;
}
