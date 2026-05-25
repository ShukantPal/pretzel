import type { ClientInfo } from '@/interfaces/types';

export function listPresentClients(
  attachments: Array<{ id: string; name: string; role: ClientInfo['role'] }>,
): ClientInfo[] {
  return attachments.map((attachment) => ({
    id: attachment.id,
    name: attachment.name,
    role: attachment.role,
  }));
}
