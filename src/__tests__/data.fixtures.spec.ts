// note: so we can require this / execute inline code while dev :-)
import * as _ from 'lodash';
import * as _f from 'lodash/fp';
import {
  ALL_DOCUMENTS,
  limitOwned_DocsOfMeAndMyCompanyUsers,
  limitOwned_DocsOfMeAndMyManagedUsers,
  limitOwned_listUserCreatedDocuments,
  listOwned_DocsOfMeAndMyCompanyUsers,
  listOwned_DocsOfMeAndMyManagedUsers,
  listOwned_listUserCreatedDocuments,
  IMyUser,
  IDocument,
  USERS,
} from './data.fixtures';

describe('Fixtures tests', () => {
  // prettier-ignore
  describe('listOwned', () => {
    it('lists documentIds created by user', async () => {
      expect(await listOwned_listUserCreatedDocuments(USERS.employee1)).toIncludeSameMembers([1, 10, 100]);
    });

    it('lists documentIds created by User and created by all managed Users', async () => {
      expect(await listOwned_DocsOfMeAndMyManagedUsers(USERS.employee1)).toIncludeSameMembers([1, 10, 100]);
      expect(await listOwned_DocsOfMeAndMyManagedUsers(USERS.employeeManager2)).toIncludeSameMembers( [1, 10, 100, 2, 20, 200, 4, 40, 400]);
      expect(await listOwned_DocsOfMeAndMyManagedUsers(USERS.qaManager3)).toIncludeSameMembers([2, 20, 200, 3, 30, 300, 5, 50, 500]);
    });

    it('list Docs Of User and of all users in user`s Company ', async () => {
      expect(await listOwned_DocsOfMeAndMyCompanyUsers(
        USERS.employee1)).toIncludeSameMembers(
        [1, 10, 100, 2, 20, 200, 3, 30, 300, 7, 70, 700]);
      expect(await listOwned_DocsOfMeAndMyCompanyUsers(
        USERS.companyAdmin4)).toIncludeSameMembers(
        [4, 40, 400, 5, 50, 500, 6, 60, 600]);
    });


    it('list Docs Of User + of users managed by User + of all users in user`s Company', async () => {
      const allowedDocIds: number[] = _.uniq([
        ...(await listOwned_DocsOfMeAndMyManagedUsers(USERS.managerAndCompanyAdmin7)),
        ...(await listOwned_DocsOfMeAndMyCompanyUsers(USERS.managerAndCompanyAdmin7)),
      ]);

      expect(allowedDocIds).toIncludeSameMembers(
        [1, 10, 100, 2, 20, 200, 3, 30, 300, 5, 50, 500, 6, 60, 600, 7, 70, 700]);
    });
  });

  describe('limitOwned', () => {
    it('filters documentIds created by user', async () => {
      const limitOwnDocs = limitOwned_listUserCreatedDocuments({ user: USERS.employee1 });
      expect(
        _f
          .filter(limitOwnDocs)(ALL_DOCUMENTS)
          .map((doc: IDocument) => doc.id)
      ).toIncludeSameMembers([1, 10, 100]);
    });

    it('filters documentIds created by User and created by all managed Users', () => {
      const getFilteredDocumentIdsForUser = (user: IMyUser) => {
        const limitOwnDocs = limitOwned_DocsOfMeAndMyManagedUsers({ user });
        return _f
          .filter(limitOwnDocs)(ALL_DOCUMENTS)
          .map((doc: IDocument) => doc.id);
      };

      expect(getFilteredDocumentIdsForUser(USERS.employee1)).toIncludeSameMembers([1, 10, 100]);
      // prettier-ignore
      expect(getFilteredDocumentIdsForUser(USERS.employeeManager2)).toIncludeSameMembers(
        [1, 10, 100, 2, 20, 200, 4, 40, 400]);
      // prettier-ignore
      expect(getFilteredDocumentIdsForUser(USERS.qaManager3)).toIncludeSameMembers(
        [2, 20, 200, 3, 30, 300, 5, 50, 500]);
    });

    it('filters Docs Of User and of all users in user`s Company ', () => {
      const getFilteredDocumentIdsForUser = (user: IMyUser) => {
        const limitOwnDocs = limitOwned_DocsOfMeAndMyCompanyUsers({ user });
        return _f
          .filter(limitOwnDocs)(ALL_DOCUMENTS)
          .map((doc: IDocument) => doc.id);
      };

      // prettier-ignore
      expect(getFilteredDocumentIdsForUser(USERS.employee1)).toIncludeSameMembers(
        [1, 10, 100, 2, 20, 200, 3, 30, 300, 7, 70, 700, ]);

      // prettier-ignore
      expect(getFilteredDocumentIdsForUser(USERS.companyAdmin4)).toIncludeSameMembers(
        [4, 40, 400, 5, 50, 500, 6, 60, 600,]);
    });
  });
});
