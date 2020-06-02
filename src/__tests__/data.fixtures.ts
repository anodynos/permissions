/* eslint-disable @typescript-eslint/camelcase */
// Our "Database"
import * as _f from 'lodash/fp';
import * as _ from 'lodash';

import { IUser, TisOwner, TlimitOwned, TlistOwned } from '../types';

export interface IMyUser {
  id: number;
  roles: string[];
} // an IUser variant

export const USERS: { [name: string]: IMyUser } = {
  employee1: { id: 1, roles: ['EMPLOYEE'] },
  employeeManager2: { id: 2, roles: ['EMPLOYEE_MANAGER'] },
  qaManager3: { id: 3, roles: ['QA_MANAGER'] },
  companyAdmin4: { id: 4, roles: ['COMPANY_ADMIN'] },
  superAdmin5: { id: 5, roles: ['SUPER_ADMIN'] },
  god6: { id: 6, roles: ['GOD'] },
  managerAndCompanyAdmin7: { id: 7, roles: ['EMPLOYEE_MANAGER', 'COMPANY_ADMIN'] },
  employeeAndSuperAdmin8: { id: 8, roles: ['EMPLOYEE', 'SUPER_ADMIN'] },
};

export const USER_CREATED_DOCUMENTS: { [userId: number]: number[] } = {
  // userId: documentId[]
  1: [1, 10, 100],
  2: [2, 20, 200],
  3: [3, 30, 300],
  4: [4, 40, 400],
  5: [5, 50, 500],
  6: [6, 60, 600],
  7: [7, 70, 700],
  8: [8, 80, 800],
};

export interface IDocument {
  id: number;
  title: string;
  date: string;
  someRandomField: string;
  confidential: string;
}

export const ALL_DOCUMENTS_IDS = _f.flow(_f.values, _f.flatten)(USER_CREATED_DOCUMENTS);
export const ALL_DOCUMENTS: IDocument[] = _.flatten(_.values(USER_CREATED_DOCUMENTS)).map((id) => ({
  id,
  title: `Document Title ${id}`,
  date: `2020-02-0${[`${id}`][0]}`,
  someRandomField: `Some random value ${id}`,
  confidential: `Confidential ${id}`,
} as any));

export const USER_MANAGES_MANY_USERS: { [userId: number]: number[] } = {
  // userId: userId[]
  2: [1, 4], // on purpose in different companies, so we get different sets
  3: [2, 5],
  7: [5, 6],
};

export const USER_BELONGS_TO_ONE_COMPANY: { [userId: number]: number } = {
  // userId: companyId
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 2,
  7: 1,
};

// ### Owner hooks ###
export type DocumentFilterPredicate = (IDocument) => boolean;

// Ownership if I am the direct document creator
export const isUserCreatorOfDocument = ({ user, resourceId }) =>
  (USER_CREATED_DOCUMENTS[user.id] || []).includes(resourceId as any);

export const listUserCreatedDocuments = async (user) => USER_CREATED_DOCUMENTS[user.id] || [];

export const isOwner_isUserCreatorOfDocument: TisOwner = async ({ user, resourceId }) =>
  isUserCreatorOfDocument({ user, resourceId });

export const listOwned_listUserCreatedDocuments: TlistOwned = async (user) =>
  listUserCreatedDocuments(user);

export const limitOwned_listUserCreatedDocuments: TlimitOwned<number, DocumentFilterPredicate> = ({
  user,
}) => (document: IDocument) => (USER_CREATED_DOCUMENTS[user.id] || []).includes(document.id);

// Ownership if I am the document creator OR created by a user managed by me (i.e Employee Manager)
export const listDocsOfMeAndMyManagedUsers = (user: IUser) => [
  ...(USER_CREATED_DOCUMENTS[user.id] || []),
  ..._.flatten(
    (USER_MANAGES_MANY_USERS[user.id] || []).map((userId) => USER_CREATED_DOCUMENTS[userId])
  ),
];

export const isOwner_isDocCreatedByMeAndMyManagedUsers: TisOwner = async ({ user, resourceId }) =>
  listDocsOfMeAndMyManagedUsers(user).includes(resourceId as any);

export const listOwned_DocsOfMeAndMyManagedUsers: TlistOwned = async (user: IUser) =>
  listDocsOfMeAndMyManagedUsers(user);

export const limitOwned_DocsOfMeAndMyManagedUsers: TlimitOwned<number, DocumentFilterPredicate> = ({
  user,
}) => (document: IDocument) => listDocsOfMeAndMyManagedUsers(user).includes(document.id);

// Ownership if I am the Document creator OR created by a User in my Company (i.e Company Admin)
export const listDocsOfMeAndMyCompanyUsers = (user: IUser) => {
  const companyId = USER_BELONGS_TO_ONE_COMPANY[user.id];

  return _.flow(
    _f.pickBy(_f.isEqual(companyId)),
    _f.keys,
    _f.map((userId) => USER_CREATED_DOCUMENTS[userId]),
    _f.flatten,
    _f.uniq
  )(USER_BELONGS_TO_ONE_COMPANY);
};

export const isOwner_isDocCreatedByMeAndMyCompanyUsers: TisOwner = async ({ user, resourceId }) =>
  listDocsOfMeAndMyCompanyUsers(user).includes(resourceId as any);

export const listOwned_DocsOfMeAndMyCompanyUsers: TlistOwned = async (user: IUser) =>
  listDocsOfMeAndMyCompanyUsers(user);

export const limitOwned_DocsOfMeAndMyCompanyUsers: TlimitOwned<number, DocumentFilterPredicate> = ({
  user,
}) => (document: IDocument) => listDocsOfMeAndMyCompanyUsers(user).includes(document.id);
