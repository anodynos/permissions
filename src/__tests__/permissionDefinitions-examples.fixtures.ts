import { PermissionDefinition } from '../PermissionDefinitions';
import {
  isOwner_isDocCreatedByMeAndMyCompanyUsers,
  isOwner_isDocCreatedByMeAndMyManagedUsers,
  isOwner_isUserCreatorOfDocument,
  listOwned_DocsOfMeAndMyCompanyUsers,
  listOwned_DocsOfMeAndMyManagedUsers,
  listOwned_listUserCreatedDocuments,
} from './data.fixtures';
import { EPossession } from '../types';

// note: we can't use new lines on PermissionDefinition.descr, as pOTS breaks prettier.
export const PD_EXAMPLE_EMPLOYEE: PermissionDefinition = {
  roles: ['EMPLOYEE'],
  resource: 'document',
  descr: `> As an **EMPLOYEE**, I can **create**, **read** & **list** only my **OWN Documents (created by me)** , all attributes except **confidential**. Also, I can **list** all **Documents** on the system, but only access the **title** & **date** attributes.`,
  isOwner: isOwner_isUserCreatorOfDocument,
  listOwned: listOwned_listUserCreatedDocuments,
  possession: EPossession.own,
  grant: {
    create: ['*', '!confidential'],
    read: ['*', '!confidential'],
    list: ['*', '!confidential'],
    'list:any': ['title', 'date'],
  },
};

export const PD_EXAMPLE_EMPLOYEE_MANAGER: PermissionDefinition = {
  roles: ['EMPLOYEE_MANAGER'],
  resource: 'document',
  descr: `> As a **EMPLOYEE_MANAGER**, I can **read**, **list**, **review** & **delete** all **Documents** created by **any User that I am managing**, all document attributes except **confidential**. Also, I can **list** all **Documents** on the system, but only access the **title**, **date** & **status** attributes.`,
  isOwner: isOwner_isDocCreatedByMeAndMyManagedUsers,
  listOwned: listOwned_DocsOfMeAndMyManagedUsers,
  possession: EPossession.own, // default from `possession` for all not having explicit (eg `read`)
  grant: {
    read: ['*', '!confidential', '!personal'],
    review: ['*', '!confidential', '!personal'],
    delete: ['*', '!confidential', '!personal'],
    list: ['*', '!confidential', '!personal'],
    'list:any': ['title', 'date', 'status'],
  },
};

export const PD_EXAMPLE_COMPANY_ADMIN: PermissionDefinition = {
  roles: ['COMPANY_ADMIN'],
  resource: 'document',
  descr: `> As a **COMPANY_ADMIN**, I can **read**, **update** and **review** all **Documents** created by **any User in my Company**, all attributes.`,
  isOwner: isOwner_isDocCreatedByMeAndMyCompanyUsers,
  listOwned: listOwned_DocsOfMeAndMyCompanyUsers,
  possession: EPossession.own,
  grant: [`read`, `update`, `review`],
};

export const PD_EXAMPLE_SUPER_ADMIN: PermissionDefinition = {
  roles: ['SUPER_ADMIN'],
  resource: '*',
  descr: `> As a **SUPER_ADMIN**, I can do all actions on **any resource** (not just documents), created by ANY User, ANY Company and access all attributes.`,
  grant: ['*'],
};

export const permissionDefinitions_examples: PermissionDefinition[] = [
  PD_EXAMPLE_EMPLOYEE,
  PD_EXAMPLE_EMPLOYEE_MANAGER,
  PD_EXAMPLE_COMPANY_ADMIN,
  PD_EXAMPLE_SUPER_ADMIN,
];
