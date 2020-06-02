import * as _ from 'lodash';
import { EPossession } from '../types';
import { Permissions } from '../Permissions';
import { eachWithOnly } from './utils/test.utils';
import { PermissionDefinition } from '../PermissionDefinitions';
import { setLogger } from '../logger';

const ignoreOnly = false;
const ignoreSkip = false;
const invertOnly = false;

const isOwner = _.noop;
const listOwned = _.noop;

setLogger(null);

describe('getDefinitions.spec', () => {
  eachWithOnly(
    [
      {
        // only: true,
        descr:
          'filters PDs & excludes matching props in `filters` from resulted PDs (if `filters` are an {})',
        filters: {
          roles: ['ADMIN', 'EMPLOYEE_MANAGER', 'EMPLOYEE'], // in different order works also :-)
          resource: 'document',
        },
        definitions: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER', 'ADMIN'],
            resource: 'document',
            isOwner,
            listOwned,
            grant: {
              read: ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER', 'ADMIN', 'EMPLOYEE'], // note: roles in diff order is fine (1st one wins)
            resource: 'document',
            isOwner,
            listOwned,
            grant: {
              'create:own': ['*', '!price', '!confidential'],
            },
          },
          {
            // this PD is omitted due to filters
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'fooaction:own': ['*'],
            },
          },
        ],
        expected: [
          {
            // eliminated cause its in filters
            // roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            // resource: 'document',
            isOwner,
            listOwned,
            grant: {
              'read:any': ['*', '!price', '!confidential'],
              'create:own': ['*', '!price', '!confidential'],
            },
          },
        ],
      },
      {
        // only: true,
        descr: 'doesnt consolidate definitions that are granted/denied to more role(s)',
        defaults: { resource: 'document' },
        definitions: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER', 'SOME_OTHER_ROLE'],
            grant: {
              read: ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE'],
            grant: {
              create: ['*', '!price', '!confidential'],
            },
          },
        ],
        expected: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER', 'SOME_OTHER_ROLE'],
            resource: 'document',
            grant: {
              'read:any': ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE'],
            resource: 'document',
            grant: {
              'create:any': ['*', '!price', '!confidential'],
            },
          },
        ],
      },

      // mergeCompatibleGrants
      {
        // only: true,
        descr: 'merge grants by joining compatible roles',
        definitions: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
            },
          },
          {
            roles: ['ANOTHER_ROLE1', 'ANOTHER_ROLE2'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
              anotherAction: ['*'],
            },
          },
        ],
        expected: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER', 'ANOTHER_ROLE1', 'ANOTHER_ROLE2'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
            },
          },
          {
            roles: ['ANOTHER_ROLE1', 'ANOTHER_ROLE2'],
            resource: 'document',
            grant: {
              'anotherAction:any': ['*'],
            },
          },
        ],
      },

      {
        // only: true,
        descr: 'doesnt merge incompatible grants',
        definitions: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
              incompatibleAction: ['*'],
            },
          },
          {
            roles: ['ANOTHER_ROLE'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
              anotherAction: ['*'],
            },
          },
        ],
        expected: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
              'incompatibleAction:any': ['*'],
            },
          },
          {
            roles: ['ANOTHER_ROLE'],
            resource: 'document',
            grant: {
              'read:any': ['*'],
              'update:any': ['*'],
              'create:any': ['*'],
              'anotherAction:any': ['*'],
            },
          },
        ],
      },

      {
        descr:
          'consolidates definitions that are granted/denied to the exact same role(s) & resources',
        defaults: { resource: 'document' },
        definitions: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            grant: {
              read: ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE'],
            isOwner,
            listOwned,
            grant: {
              read: ['*', '!price', '!confidential'],
              'create:own': ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            possession: EPossession.own,
            isOwner,
            listOwned,
            grant: {
              read: ['*'],
              update: ['*', '!price', '!confidential'],
              delete: ['*'],
              'list:any': ['title', 'date'],
            },
          },
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'comment',
            grant: {
              report: ['*'],
            },
          },
        ],
        expected: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'document',
            isOwner,
            listOwned,
            grant: {
              'read:any': ['*', '!price', '!confidential'],
              'read:own': ['*'],
              'list:any': ['title', 'date'],
              'create:own': ['*', '!price', '!confidential'],
              'delete:own': ['*'],
              'update:own': ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'comment',
            grant: {
              'report:any': ['*'],
            },
          },
        ],
      },

      {
        descr: 'deletes Defined Grants to eliminate PDs',
        definitions: [
          {
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE', 'ANOTHER_ROLE'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'baraction:own': ['*'],
              'fooaction:own': ['*'],
              list: ['*'],
            },
          },
          {
            // whole object should be eliminated, cause all it's grants are included above
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'baraction:own': ['*'],
              'fooaction:own': ['*'],
            },
          },
        ],
        expected: [
          {
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE', 'ANOTHER_ROLE'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'baraction:own': ['*'],
              'fooaction:own': ['*'],
              'list:any': ['*'],
            },
          },
        ],
      },

      {
        descr: 'consolidates all PermissionDefinitions',
        definitions: [
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER', 'ADMIN'],
            resource: 'document',
            grant: {
              'read:any': ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER', 'ADMIN', 'EMPLOYEE'], // note: roles in diff order is fine (1st one wins)
            resource: 'document',
            isOwner,
            listOwned,
            grant: {
              'read:own': ['*'], // added as well as any @todo: must be obeyed for ownership
              'create:own': ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER', 'EMPLOYEE'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'baraction:own': ['*'],
              'fooaction:own': ['*'],
              list: ['*'],
            },
          },
          {
            // whole object should be eliminated, cause all it's grants are included above
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'baraction:own': ['*'],
              'fooaction:own': ['*'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              managerAction: ['*'], // grant stays, cause its NOT included above
              'baraction:own': ['*'], // grant eliminated, cause included above
              'fooaction:own': ['*'], // grant eliminated, cause included above
            },
          },
        ],
        expected: [
          {
            roles: ['EMPLOYEE_MANAGER', 'ADMIN', 'EMPLOYEE'],
            resource: 'document',
            isOwner,
            listOwned,
            grant: {
              'read:any': ['*', '!price', '!confidential'],
              'read:own': ['*'],
              'create:own': ['*', '!price', '!confidential'],
            },
          },
          {
            roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'baraction:own': ['*'],
              'fooaction:own': ['*'],
              'list:any': ['*'],
            },
          },
          {
            roles: ['EMPLOYEE_MANAGER'],
            resource: 'comment',
            isOwner,
            listOwned,
            grant: {
              'managerAction:any': ['*'], // grant stays, cause its NOT included above
            },
          },
        ],
      },
    ],
    (
      {
        skip,
        only,
        descr,
        definitions,
        defaults = {},
        expected,
        filters = {},
      }: {
        skip?: boolean;
        only?: boolean;
        descr: string;
        definitions: PermissionDefinition[];
        defaults?: {};
        expected: any[];
        filters?: {};
      },
      onlyMode: boolean
    ) => {
      only = invertOnly ? !only : only;

      if ((skip && !ignoreSkip) || (!ignoreOnly && onlyMode && !only)) {
        it.skip(descr, () => {});
      } else {
        it(descr, () => {
          const permissions = new Permissions({
            permissionDefinitions: definitions,
            permissionDefinitionDefaults: defaults,
          }).build();
          const result = permissions.getDefinitions(filters, 'force');
          expect(result).toIncludeSameMembers(expected);
        });
      }
    }
  );
});
