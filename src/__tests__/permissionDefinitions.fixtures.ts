import * as _ from 'lodash';
import { PermissionDefinition, PermissionDefinitionDefaults } from '../PermissionDefinitions';
import {
  isOwner_isDocCreatedByMeAndMyCompanyUsers,
  isOwner_isDocCreatedByMeAndMyManagedUsers,
  isOwner_isUserCreatorOfDocument,
  limitOwned_DocsOfMeAndMyCompanyUsers,
  limitOwned_DocsOfMeAndMyManagedUsers,
  limitOwned_listUserCreatedDocuments,
  listOwned_DocsOfMeAndMyCompanyUsers,
  listOwned_DocsOfMeAndMyManagedUsers,
  listOwned_listUserCreatedDocuments,
} from './data.fixtures';
import { EPossession } from '../types';

export const permissionDefinitionDefaults: PermissionDefinitionDefaults = { resource: 'document' };

// @todo: these permissionDefinitions are used in the tests only and are NOT the same as in `detailed-usage-example.md.spec.ts` (should they be?) They do share the same data & owner hooks from "data.fixtures.ts" though.

const PD_FIXTURES_EMPLOYEE = {
  roles: ['EMPLOYEE'],
  resource: 'document', // can be omitted, since it's the default (in the readme example & tests).
  // You can always override it here.
  descr: `
      * I Can CRUD only OWN Documents (i.e created by me).
      * I Can't read or write 'price' and 'confidential' fields.
    `,
  isOwner: isOwner_isUserCreatorOfDocument,
  listOwned: listOwned_listUserCreatedDocuments,
  possession: EPossession.own,
  grant: {
    // all CRUD operations inherit possession: own from above
    create: ['*', '!price', '!confidential'],
    read: ['*', '!price', '!confidential'],
    update: ['*', '!price', '!confidential'],
    // ['*'] for test's sake :-)
    delete: ['*'],
    list: ['*'],
    publish: ['title', 'content', 'createDate'],
    share: ['title', 'content', 'publishDate'],
    // @note: override `possession: own` above in "list:own" with `list:any`, with DIFFERENT attributes
    'list:any': ['title', 'createDate'],
    'browse:any': ['title', 'content'],
  },
};

const PD_FIXTURES_EMPLOYEE_MANAGER_AND_QA_MANAGER = {
  roles: ['EMPLOYEE_MANAGER', 'QA_MANAGER'],
  // resource: 'document', not needed, using the defaults
  descr: `
      * I Can CRUD all Documents that are created by me OR any User that I manage.
      * I can't read or write only the 'price' field.
    `,
  isOwner: isOwner_isDocCreatedByMeAndMyManagedUsers,
  listOwned: listOwned_DocsOfMeAndMyManagedUsers,
  /* Instead of

        grant: {
          'create:own': ['*', '!price'],
          'read:own': ['*', '!price'],
          'update:own': ['*', '!price'],
          'delete:own': ['*', '!price'],
        }

    we can keep DRYer with these 3 lines
  */
  attributes: ['*', '!price'],
  possession: EPossession.own, // equivalent to string 'own'
  grant: ['create', 'read', 'update', 'delete'],
};

const PD_FIXTURES_COMPANY_ADMIN = {
  roles: 'COMPANY_ADMIN',
  descr: `
      * I can CRUD all Documents that are created by me OR any User of my Company.
    `,
  isOwner: isOwner_isDocCreatedByMeAndMyCompanyUsers,
  listOwned: listOwned_DocsOfMeAndMyCompanyUsers,
  grant: {
    'create:own': ['*'],
    'read:own': ['*'],
    'update:own': ['*'],
    'delete:own': ['*'],
  },
};
const PD_FIXTURES_SUPER_ADMIN = {
  roles: 'SUPER_ADMIN',
  descr: `
      * I can CREATE, VIEW, EDIT or DELETE any Document, by ANY user, company etc.
      * I can read or write to any field (except delete where I can only change 'deletedAt').`,
  // Although assumed `possession: EPossession.any` we still can have own hooks, to filter our own docs
  isOwner: isOwner_isUserCreatorOfDocument,
  listOwned: listOwned_listUserCreatedDocuments,
  grant: {
    'create:any': ['*'],
    'read:any': ['*'],
    'update:any': ['*'],
    'delete:any': ['deletedAt'],
    'list:any': ['*', '!confidential'], // moreThanEmployee but withLimits
    'browse:any': ['title', 'content', 'views', 'likes'],
    'share:own': ['title', 'content', 'publishDate', 'createDate', 'revision'],
  },
};
const PD_FIXTURES_SUPER_ADMIN_COMMENT = {
  roles: 'SUPER_ADMIN',
  resource: 'comment', // override default ('document')
  descr: `
      * I can CREATE, VIEW, EDIT or DELETE any comment, by ANY user, company etc.
      * I can read or write to any field.
    `,
  grant: {
    // Not allowing 'create:any': ['*'],
    'read:any': ['*'],
    'update:any': ['*'],
    'delete:any': ['*'],
    'list:any': ['*'],
    'like:any': ['*'],
  },
};
const PD_FIXTURES_GOD = {
  roles: 'GOD',
  resource: '*',
  descr: `
      * I can any *Action on any *Resource!
      * I can to any those to any field.
    `,
  grant: {
    '*:any': ['*'],
  },
};
const PD_FIXTURES_SECURITY_HOLE = {
  roles: '*',
  resource: 'securityHole',
  descr: `
      * ALL *Role can preview:any on securityHole!
    `,
  grant: {
    'preview:any': ['*'],
  },
};

export const permissionDefinitions: PermissionDefinition[] = [
  PD_FIXTURES_EMPLOYEE,
  PD_FIXTURES_EMPLOYEE_MANAGER_AND_QA_MANAGER,
  PD_FIXTURES_COMPANY_ADMIN,
  PD_FIXTURES_SUPER_ADMIN,
  PD_FIXTURES_SUPER_ADMIN_COMMENT,
  PD_FIXTURES_GOD,
  PD_FIXTURES_SECURITY_HOLE,
];

export const permissionDefinitions_limitOwned: PermissionDefinition[] = [
  { ..._.omit(PD_FIXTURES_EMPLOYEE, 'listOwned'), limitOwned: limitOwned_listUserCreatedDocuments },
  {
    ..._.omit(PD_FIXTURES_EMPLOYEE_MANAGER_AND_QA_MANAGER, 'listOwned'),
    limitOwned: limitOwned_DocsOfMeAndMyManagedUsers,
  },
  {
    ..._.omit(PD_FIXTURES_COMPANY_ADMIN, 'listOwned'),
    limitOwned: limitOwned_DocsOfMeAndMyCompanyUsers,
  },
  {
    ..._.omit(PD_FIXTURES_SUPER_ADMIN, 'listOwned'),
    limitOwned: limitOwned_listUserCreatedDocuments,
  },
  PD_FIXTURES_SUPER_ADMIN_COMMENT,
  PD_FIXTURES_GOD,
  PD_FIXTURES_SECURITY_HOLE,
];
