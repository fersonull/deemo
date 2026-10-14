import { isDuplicate, prisma } from "../../../shared/prisma";
import type { Account, Claims } from "../domain/account";

type AccountData = Partial<Omit<Account, "id">>;

export const userRepo = {
  find: (id: string): Promise<Account | null> => prisma.user.findUnique({ where: { id } }),

  findMany: (ids: string[]): Promise<Account[]> => prisma.user.findMany({ where: { id: { in: ids } } }),

  // First sight of a Firebase user. Two first requests can race; the loser reads the winner's row.
  async create(claims: Claims): Promise<Account> {
    try {
      return await prisma.user.create({
        data: {
          id: claims.uid,
          email: claims.email,
          name: claims.name,
          emailVerified: claims.emailVerified,
          provider: claims.provider,
        },
      });
    } catch (err) {
      if (!isDuplicate(err)) throw err;
      return (await prisma.user.findUnique({ where: { id: claims.uid } }))!;
    }
  },

  update: (id: string, data: AccountData): Promise<Account> => prisma.user.update({ where: { id }, data }),

  // Deleting the user cascades to projects, analyses, sessions, reports, live starts, owned groups and memberships.
  remove: (id: string) => prisma.user.deleteMany({ where: { id } }),
};
