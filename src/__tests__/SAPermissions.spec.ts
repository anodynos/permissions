// 3rd party
import * as _ from 'lodash';
import * as _f from 'lodash/fp';
import { stdout } from 'test-console';

// own
import { getLogger, setLogger } from '../logger';
import { Permissions } from '../Permissions';
import {
  ALL_DOCUMENTS,
  ALL_DOCUMENTS_IDS,
  listOwned_DocsOfMeAndMyCompanyUsers,
  listOwned_DocsOfMeAndMyManagedUsers,
  USERS,
} from './data.fixtures';
import { Permit } from '../Permit.class';
import {
  permissionDefinitionDefaults,
  permissionDefinitions,
  permissionDefinitions_limitOwned,
} from './permissionDefinitions.fixtures';
import { Tid } from '../types';

export enum ECrudActions {
  create = 'create',
  read = 'read',
  update = 'update',
  delete = 'delete',
}

let permit: Permit;
const nonOwnResourceId = 99999;

/**
 * @todo: restructure tests around features, instead of the naive user-can-do-that syntax :-)
 */
const permissions = new Permissions({
  permissionDefinitions,
  permissionDefinitionDefaults,
}).build();

const permissions_limitOwned = new Permissions({
  permissionDefinitions: permissionDefinitions_limitOwned,
  permissionDefinitionDefaults,
  limitOwnReduce: ({ user, limitOwneds }) =>
    _.overSome(limitOwneds.map((limitOwned) => limitOwned({ user }))),
}).build();

describe('SuperAwesome Permissions', () => {
  describe('Basic usage & error handling', () => {
    describe('PermissionsDefinitions validations at addDefinitions phase', () => {
      it('throws error when PD lacks "resource"', () => {
        const errRE = /InvalidPermissionDefinitionError: missing "resource"/;
        expect(
          () => new Permissions({ permissionDefinitions: { roles: ['ADMIN'], grant: ['foo'] } })
        ).toThrow(errRE);

        expect(() => {
          const p = new Permissions();
          p.addDefinitions({ roles: ['ADMIN'], grant: ['foo'] });
        }).toThrow(errRE);
      });

      it('throws error when PD lacks "role"', () => {
        const errRE = /InvalidPermissionDefinitionError: missing "roles"/;
        expect(
          () => new Permissions({ permissionDefinitions: { resource: 'document', grant: ['foo'] } })
        ).toThrow(errRE);

        expect(() => {
          const p = new Permissions();
          p.addDefinitions({ resource: 'document', grant: ['foo'] });
        }).toThrow(errRE);
      });

      it('throws error when PD lacks "grant"', () => {
        const errRE = /InvalidPermissionDefinitionError: missing or empty "grant"/;
        expect(
          () =>
            new Permissions({
              permissionDefinitions: { resource: 'document', roles: ['someRole'] },
            })
        ).toThrow(errRE);
      });

      describe('redefining actions attributes', () => {
        it('throws error when redefined attributes are DIFFERENT for same role & resource', () =>
          expect(
            () =>
              new Permissions({
                permissionDefinitions: [
                  {
                    resource: 'document',
                    roles: ['someRole'],
                    grant: {
                      'list:any': ['foo', 'bar'],
                    },
                  },
                  {
                    resource: 'document',
                    roles: ['someRole'],
                    grant: {
                      'list:any': ['bar', 'foo'],
                    },
                  },
                ],
              })
          ).toThrow('InvalidPermissionDefinitionError: addDefinitions() redefining action error'));

        it('just warns when redefined attributes are SAME for same role & resource', () => {
          const oldLogger = getLogger();
          setLogger({
            warn(msg, data) {
              process.stdout.write(msg, data);
            },
            debug: _.noop,
          } as any);
          const output = stdout.inspectSync(
            () =>
              new Permissions({
                permissionDefinitions: [
                  {
                    resource: 'document',
                    roles: ['matchingRole', 'someOtherRole'],
                    grant: {
                      'list:any': ['foo', 'bar'],
                    },
                  },
                  {
                    resource: 'document',
                    roles: ['matchingRole', 'anotherRole'],
                    grant: {
                      'list:any': ['foo', 'bar'],
                    },
                  },
                ],
              })
          );

          expect(output[0]).toMatch(
            'addDefinitions() redefining action in a PD with same attributes is obsolete:'
          );
          setLogger(oldLogger);
        });

        it('all is good for different roles', () => {
          const output = stdout.inspectSync(
            () =>
              new Permissions({
                permissionDefinitions: [
                  {
                    resource: 'document',
                    roles: ['matchingRole', 'someOtherRole'],
                    grant: {
                      'list:any': ['foo', 'bar'],
                    },
                  },
                  {
                    resource: 'document',
                    roles: ['nonMatchingRole', 'anotherRole'],
                    grant: {
                      'list:any': ['foo', 'bar'],
                    },
                  },
                ],
              })
          );

          expect(output[0]).toBeUndefined();
        });
      });

      describe('Validating ownership hooks', () => {
        describe('In the current added PD', () => {
          const permissionDefinition = {
            roles: ['ADMIN'],
            resource: 'document',
            grant: ['foo:own'],
          };
          it.each([
            [{ ...permissionDefinition }],
            [{ ...permissionDefinition, isOwner: _.noop as any } as any],
            [{ ...permissionDefinition, listOwner: _.noop as any } as any],
            [{ ...permissionDefinition, limitOwner: _.noop as any } as any],
          ])(
            `throws error @addDefinitions if PD has 'own' action but NO 'isOwner' or 'listOwned' for this role can be found`,
            (pd) => {
              expect(() => new Permissions({ permissionDefinitions: pd })).toThrow(
                /SA-Permissions: in addDefinitions\(\) PermissionDefinition has 'own' action but no/
              );
            }
          );
        });

        it(`doesnt throw error @addDefinitions if PD has no 'own' actions`, () => {
          expect(() => {
            new Permissions({
              permissionDefinitions: [
                {
                  roles: ['EMPLOYEE', 'ADMIN', 'SOME_ROLE'],
                  resource: 'document',
                  grant: ['foo:any'],
                },
              ],
            }).build();
          }).not.toThrow(/./);
        });

        it(`throws error @addDefinitions if PD has 'own' action and has both 'listOwned' & 'limitOwned' in the same PD`, () => {
          expect(() => {
            new Permissions({
              permissionDefinitions: [
                {
                  roles: ['EMPLOYEE', 'ADMIN', 'SOME_ROLE'],
                  resource: 'document',
                  grant: ['foo:own'],
                  isOwner: _.noop as any,
                  limitOwned: _.noop as any,
                  listOwned: _.noop as any,
                } as any,
                {
                  roles: ['ADMIN', 'EMPLOYEE'], // both matched with above
                  resource: 'document',
                  grant: ['bar:own'],
                },
              ],
            }).build();
          }).toThrow(
            /SA-Permissions: in addDefinitions\(\) found BOTH "listOwned" & "limitOwned" callbacks in the added PermissionDefinition/
          );
        });

        it(`throws error @addDefinitions if PD has 'own' action and can find PDs resulting having both 'listOwned' & 'limitOwned' for this resource`, () => {
          expect(() => {
            new Permissions({
              permissionDefinitions: [
                {
                  roles: ['EMPLOYEE', 'ADMIN', 'SOME_ROLE'],
                  resource: 'document',
                  grant: ['foo:own'],
                  isOwner: _.noop as any,
                  limitOwned: _.noop as any,
                },
                {
                  roles: ['ADMIN', 'EMPLOYEE'], // both matched with above
                  resource: 'document',
                  grant: ['bar:own'],
                  isOwner: _.noop as any,
                  listOwned: _.noop as any,
                },
              ],
            }).build();
          }).toThrow(
            /SA-Permissions: in addDefinitions\(\) found BOTH "listOwned" & "limitOwned" callbacks in some PermissionDefinition/
          );
        });
      });
    });

    describe(`grantPermit() phase / after build()`, () => {
      it('throws error @addDefinitions if addDefinitions is called after build()', () => {
        const permissions2 = new Permissions({
          permissionDefinitions: {
            roles: ['ADMIN'],
            resource: 'document',
            grant: ['foo'],
          },
        });

        permissions2.build();

        expect(() =>
          permissions2.addDefinitions({
            resource: 'document',
            roles: ['SOME_ROLE'],
            grant: ['foo'],
          })
        ).toThrow(/InvalidInvocation: calling addDefinitions\(\) after having build\(\)/);
      });

      it('doesnt throw error on grantPermit with empty user.roles', async () => {
        const permissions2 = new Permissions({
          permissionDefinitions: {
            roles: ['ADMIN'],
            resource: 'document',
            grant: ['foo'],
          },
        });

        permissions2.build();

        const permit2 = await permissions2.grantPermit({
          resource: 'document',
          user: { roles: [], id: 1 },
          action: 'foo',
        });

        expect(permit2).toBeInstanceOf(Permit);
        expect(permit2.granted).toBe(false);
        expect(permit2.anyGranted).toBe(false);
        expect(permit2.anyAttributes).toStrictEqual([]);
        expect(permit2.ownGranted).toBe(false);
        expect(permit2.ownAttributes).toStrictEqual([]);
        expect(await permit2.attributes()).toStrictEqual([]);
      });

      it('throws error on grantPermit with invalid resource', async () => {
        const permissions2 = new Permissions({
          permissionDefinitions: {
            roles: ['ADMIN'],
            resource: 'document',
            grant: ['foo'],
          },
        });

        permissions2.build();

        await expect(
          permissions2.grantPermit({
            resource: 'invalidResource',
            user: { roles: ['ADMIN'], id: 1 },
            action: 'foo',
          })
        ).rejects.toThrow(/Invalid resource: "invalidResource"/);
      });

      describe('Invalid actions', () => {
        it('throws error on grantPermit with missing action (from AccessControl::permission()', async () => {
          const permissions2 = new Permissions({
            permissionDefinitions: {
              roles: ['ADMIN'],
              resource: 'document',
              grant: ['foo'],
            },
          });

          permissions2.build();

          await expect(
            permissions2.grantPermit({
              resource: 'document',
              user: { roles: ['ADMIN'], id: 1 },
              action: 'invalidAction',
            })
          ).rejects.toThrow(/Invalid action: invalidAction/);
        });

        it('throws error on grantPermit with invalid action with colon (from SA-Permissions)', async () => {
          const permissions2 = new Permissions({
            permissionDefinitions: {
              roles: ['ADMIN'],
              resource: 'document',
              grant: ['foo:any'],
            },
          });

          permissions2.build();

          await expect(
            permissions2.grantPermit({
              resource: 'document',
              user: { roles: ['ADMIN'], id: 1 },
              action: 'foo:any',
            })
          ).rejects.toThrow(/Invalid action structure: "foo:any"/);
        });
      });

      describe('Ownership hooks', () => {
        it('are called once per isOwn()/listOwn() call (they are added as _.uniq to Permit)', async () => {
          const isOwner = jest.fn().mockResolvedValue(false);
          const isOwner2 = jest.fn().mockResolvedValue(false);
          const listOwned = jest.fn().mockResolvedValue([1, 2, 3]);
          const listOwned2 = jest.fn().mockResolvedValue([3, 4, 5]);

          const permissions2 = new Permissions({
            permissionDefinitions: [
              {
                roles: ['ROLE1'],
                resource: 'document',
                grant: ['someOwnAction:own'],
                isOwner,
                listOwned,
              },
              {
                roles: ['ROLE2'],
                resource: 'document',
                grant: ['someOwnAction:own'],
                isOwner,
                listOwned,
              },
              {
                roles: ['ROLE3'],
                resource: 'document',
                grant: ['someOwnAction:own'],
                isOwner: isOwner2,
                listOwned: listOwned2,
              },
            ],
          }).build();

          const permit2 = await permissions2.grantPermit({
            action: 'someOwnAction',
            resource: 'document',
            user: { id: 1, roles: ['ROLE1', 'ROLE2', 'ROLE3'] },
          });

          const isOwnDocumentId = await permit2.isOwn(999);
          expect(isOwner.mock.calls.length).toBe(1);
          expect(isOwner2.mock.calls.length).toBe(1);
          expect((permit2 as any)._isOwners.length).toBe(2);
          expect(isOwnDocumentId).toBe(false);

          const ownResourceIds = await permit2.listOwn();
          expect(listOwned.mock.calls.length).toBe(1);
          expect(listOwned2.mock.calls.length).toBe(1);
          expect((permit2 as any)._listOwneds.length).toBe(2);
          expect(ownResourceIds).toEqual([1, 2, 3, 4, 5]);
        });
      });
    });
  });

  describe('example permissionDefinitions based specs', () => {
    describe(`Possession 'any' permission checks`, () => {
      _.each([undefined, 100, 200, USERS.superAdmin5.id * 100, nonOwnResourceId], (resourceId) =>
        it(`grants SUPER_ADMIN to read ANY document: ${resourceId}`, async () => {
          expect(
            (
              await permissions.grantPermit({
                user: USERS.superAdmin5,
                resource: 'document',
                action: 'read',
                resourceId,
              })
            ).granted
          ).toEqual(true);
        })
      );
    });

    describe(`Possession 'own' permission checks:`, () => {
      describe('listOwn() & limitOwn() for owned resources', () => {
        describe(`simple role - an employee`, () => {
          const authQuery = {
            user: USERS.employee1,
            resource: 'document',
            action: 'browse',
          };

          it('listOwn()', async () => {
            const permit2 = await permissions.grantPermit(authQuery);
            expect(await permit2.listOwn()).toEqual([1, 10, 100]);
          });

          it('limitOwn()', async () => {
            const permit2 = await permissions_limitOwned.grantPermit(authQuery);
            expect(
              ALL_DOCUMENTS.filter(permit2.limitOwn()).map((doc) => doc.id)
            ).toIncludeSameMembers([1, 10, 100]);
          });
        });

        describe(`inherit from multiple roles - a Manager & CompanyAdmin`, () => {
          const user = USERS.managerAndCompanyAdmin7;
          const authQuery = {
            user,
            resource: 'document',
            action: 'read',
          };
          let allowedDocIds: number[];

          beforeAll(async () => {
            allowedDocIds = _.uniq([
              ...(await listOwned_DocsOfMeAndMyManagedUsers(user)),
              ...(await listOwned_DocsOfMeAndMyCompanyUsers(user)),
            ]);
          });

          it('listOwn()', async () => {
            const permit2 = await permissions.grantPermit(authQuery);
            expect(await permit2.listOwn()).toIncludeSameMembers(allowedDocIds);
          });

          it('limitOwn()', async () => {
            const permit2 = await permissions_limitOwned.grantPermit(authQuery);
            expect(
              ALL_DOCUMENTS.filter(permit2.limitOwn()).map((doc) => doc.id)
            ).toIncludeSameMembers(allowedDocIds);
          });
        });
      });

      describe(`Denies or grants based on possession & ownership of known/unknown resourceId:`, () => {
        // eslint-disable-next-line guard-for-in
        for (const crudAction in ECrudActions) {
          it(`denies EMPLOYEE to CRUD ${crudAction} ANY document (of unknown resourceId), but allows OWN resourceId later on`, async () => {
            const user = USERS.employee1;
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: crudAction,
            });
            expect(permit2.granted).toBe(true);
            expect(permit2.ownGranted).toBe(true);

            // any is NOT granted
            expect(permit2.anyGranted).toBe(false);

            // but own resourceId is granted
            expect(await permit2.isOwn(USERS.employee1.id * 100)).toBe(true);
          });

          it(`denies EMPLOYEE to CRUD ${crudAction} NOT OWNED document`, async () => {
            const user = USERS.employee1;
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: crudAction,
              resourceId: nonOwnResourceId,
            });
            expect(permit2.granted).toBe(false);
            expect(permit2.anyGranted).toBe(false);
            expect(permit2.ownGranted).toBe(false);
          });

          it(`grants EMPLOYEE to CRUD ${crudAction} OWNED document`, async () => {
            const user = USERS.employee1;
            const ownResourceId = USERS.employee1.id * 100;
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: crudAction,
              resourceId: ownResourceId,
            });
            expect(permit2.granted).toBe(true);
            expect(permit2.ownGranted).toBe(true);
            expect(permit2.anyGranted).toBe(false);
          });

          it(`grants SUPER_ADMIN to CRUD ${crudAction} NOT OWNED document`, async () => {
            const user = USERS.superAdmin5;
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: crudAction,
              resourceId: nonOwnResourceId,
            });
            expect(permit2.granted).toBe(true);
            expect(permit2.anyGranted).toBe(true);

            // if anyGranted, we always have ownGranted
            expect(permit2.ownGranted).toBe(true);

            // we still know it's not an own resourceId
            expect(await permit2.isOwn(nonOwnResourceId)).toBe(false);
            // but recognise our own resourceId
            expect(await permit2.isOwn(user.id * 100)).toBe(true);
          });
        }

        it(`if isOnwer or listOwned is defined in PD, but the grant was for 'any', we should still be able to use isOwn & listOwn.`, async () => {
          const permit2: Permit = await permissions.grantPermit({
            user: USERS.employee1,
            resource: 'document',
            action: 'browse',
          });

          expect(permit2.granted).toEqual(true);
          expect(permit2.anyGranted).toEqual(true);
          expect(permit2.ownGranted).toEqual(true);
          expect(await permit2.isOwn(100)).toEqual(true);
          expect(await permit2.isOwn(200)).toEqual(false);
          expect(await permit2.listOwn()).toEqual([1, 10, 100]);
        });
      });

      describe(`Can override default possession:`, () => {
        it(`grants EMPLOYEE to 'list' ANY document`, async () => {
          expect(
            (
              await permissions.grantPermit({
                user: USERS.employee1,
                resource: 'document',
                action: 'list',
              })
            ).granted
          ).toEqual(true);
        });
      });

      _.each([1, 10, 100, 2, 20, 200, 4, 40, 400], (resourceId) =>
        it('grants EMPLOYEE_MANAGER to read OWNED documents of managed users + created by self', async () => {
          expect(
            (
              await permissions.grantPermit({
                user: USERS.employeeManager2,
                resource: 'document',
                action: 'read',
                resourceId,
              })
            ).granted
          ).toEqual(true);
        })
      );

      _.each([3, 5, 6], (resourceId) =>
        it('denies EMPLOYEE_MANAGER to read:own NON-OWNED documents (of non-managed users)', async () => {
          expect(
            (
              await permissions.grantPermit({
                user: USERS.employeeManager2,
                resource: 'document',
                action: 'read',
                resourceId,
              })
            ).granted
          ).toEqual(false);
        })
      );
    });

    describe(`Multiple Roles:`, () => {
      it(`respects widening granting Role permissions (admin's grant should win)`, async () => {
        expect(
          (
            await permissions.grantPermit({
              user: USERS.employeeAndSuperAdmin8,
              resource: 'document',
              action: 'delete',
            })
          ).granted
        ).toEqual(true);
      });
    });

    describe('retrieves correct PD data (roles, actions, resources) without polluting other instances', () => {
      let permissions2: Permissions; // the other instance, should not pollute ;-)

      beforeEach(() => {
        permissions2 = new Permissions({
          permissionDefinitions: [
            {
              roles: ['FOO_ROLE'],
              resource: 'fooResource',
              grant: { fooAction: ['*'] },
            },
          ],
        }).build();
      });

      it(`returns all known getResources()`, () => {
        expect(permissions.getResources()).toEqual(['comment', 'document', 'securityHole']);
        expect(permissions2.getResources()).toEqual(['fooResource']);
      });

      it(`returns all known getRoles()`, () => {
        expect(permissions.getRoles()).toEqual(
          [
            'EMPLOYEE',
            'EMPLOYEE_MANAGER',
            'QA_MANAGER',
            'COMPANY_ADMIN',
            'SUPER_ADMIN',
            'GOD',
          ].sort()
        );
        expect(permissions2.getRoles()).toEqual(['FOO_ROLE']);
      });

      it(`returns all known getResources()`, () => {
        expect(permissions.getActions()).toEqual(
          [
            'publish',
            'browse',
            'create',
            'read',
            'update',
            'delete',
            'like',
            'list',
            'preview',
            'share',
          ].sort()
        );
        expect(permissions2.getActions()).toEqual(
          ['create', 'read', 'update', 'delete', 'fooAction'].sort()
        );
      });
    });

    describe(`Supports wildcards '*':`, () => {
      describe(`wildcard '*' for Action & Resource, for God like roles`, () => {
        for (const action of permissions.getActions()) {
          for (const resource of permissions.getResources()) {
            for (const resourceId of [
              undefined,
              100,
              200,
              USERS.superAdmin5.id * 100,
              nonOwnResourceId,
            ]) {
              it(`grants GOD to ANY *Action (${action}) to ANY *Resource (${resource}): ${resourceId}`, async () => {
                expect(
                  (
                    await permissions.grantPermit({
                      user: USERS.god6,
                      resource,
                      action,
                      resourceId,
                    })
                  ).granted
                ).toEqual(true);
              });
            }
          }
        }
      });

      describe(`wildcard '*' for Roles, for "permit everyone" like Resources / Routes`, () => {
        for (const role of permissions.getRoles()) {
          for (const resourceId of [
            undefined,
            100,
            200,
            USERS.superAdmin5.id * 100,
            nonOwnResourceId,
          ]) {
            it(`grants ${role} to preview to ANY securityHole:`, async () => {
              expect(
                (
                  await permissions.grantPermit({
                    user: { id: 999, roles: [role] },
                    resource: 'securityHole',
                    action: 'preview',
                    resourceId,
                  })
                ).granted
              ).toEqual(true);
            });
          }
        }
      });
    });

    describe(`Error handling`, () => {
      it(`filters out unknown roles but it does "logger.warn" about them once per instance`, async () => {
        const user = { ...USERS.employee1, roles: [...USERS.employee1.roles, 'UNKNOWN_ROLE'] };
        // const inspect = stdout.inspect();
        const oldLogger = getLogger();
        const mockLogger = Object.create(oldLogger.constructor.prototype);
        mockLogger.warn = jest.fn();
        setLogger(mockLogger);

        for (let i = 1; i < 3; i++) {
          const { granted } = await permissions.grantPermit({
            user,
            resource: 'document',
            action: 'list',
          });

          expect(granted).toEqual(true);
        }

        expect(mockLogger.warn.mock.calls.length).toBe(1);
        expect(mockLogger.warn.mock.calls[0][0]).toBe(
          `SA-Permissions(): at grantPermit(), role not found: UNKNOWN_ROLE (will not warn again about this role)`
        );
        setLogger(oldLogger);
      });
    });

    describe('Multiple roles', () => {
      _.each([100, 600], (resourceId) =>
        it(`denies QA_MANAGER to read non owned documents ${resourceId} (of non-managed users)`, async () => {
          expect(
            (
              await permissions.grantPermit({
                user: USERS.qaManager3,
                resource: 'document',
                action: 'read',
                resourceId,
              })
            ).granted
          ).toEqual(false);
        })
      );

      describe('Inheriting multiple isOwner / listOwned from multiple roles', () => {
        const user = USERS.managerAndCompanyAdmin7;
        let allowedDocIds: number[];

        beforeAll(async () => {
          allowedDocIds = _.uniq([
            ...(await listOwned_DocsOfMeAndMyManagedUsers(user)),
            ...(await listOwned_DocsOfMeAndMyCompanyUsers(user)),
          ]);
        });

        it(`grants managerAndCompanyAdmin7 to read:own all OWNED documents
                 (created by user + of managed users + of company users)`, async () => {
          for (const resourceId of allowedDocIds) {
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: 'read',
              resourceId,
            });

            expect(permit2.granted).toBeTrue();
          }
        });

        it(`returns a Permit::listOwn() produces a list of owned docs
                  (created by user + of managed users + of company users) even if grant is denied because of resourceId`, async () => {
          for (const resourceId of ALL_DOCUMENTS_IDS) {
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: 'read',
              resourceId,
            });

            expect(await permit2.listOwn()).toIncludeSameMembers(allowedDocIds);
          }
        });

        it(`denies managerAndCompanyAdmin7 to read NOT OWNED document
                 (NOT created by user + of managed users + of company users)`, async () => {
          for (const resourceId of _.difference(ALL_DOCUMENTS_IDS, allowedDocIds)) {
            const permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action: 'read',
              resourceId,
            });

            expect(permit2.granted).toBeFalse();
          }
        });
      });
    });

    describe(`Permit::attributes(), pick() & filterPick():`, () => {
      const createItemWithId = (resourceItemKeys, id: Tid, addId = true) =>
        _.reduce(
          resourceItemKeys,
          (item, key) => {
            item[key] = key + id;
            return item;
          },
          addId ? { id: Number(id) } : {}
        );

      const pickAndCheckEqualSet = async (
        permit2: Permit,
        resourceItem: object,
        resourceId: number,
        expectedKeys: string[]
      ) => {
        const pickedItem = resourceId
          ? await permit2.pick(resourceItem, resourceId)
          : await permit2.pick(resourceItem);

        expect(_.keys(pickedItem)).toIncludeSameMembers(expectedKeys);
        expect(_.values(_.pickBy(pickedItem, (v, key) => key !== 'id'))).toIncludeSameMembers(
          expectedKeys.filter((key) => key !== 'id')
        );
      };

      const filterPickAndCheckEqualSet = async (
        permit2: Permit,
        resourceItems: any[],
        expectedItems: any[]
      ) => {
        const pickedItems = await permit2.filterPick(resourceItems);
        expect(pickedItems).toIncludeSameMembers(expectedItems);
      };

      const resourceItemKeys = [
        'title',
        'content',
        'views',
        'likes',
        'publishDate',
        'createDate',
        'revision',
        'deletedAt',
        'confidential',
        'withLimits',
      ];

      const aResourceItem = createItemWithId(resourceItemKeys, '', false);

      describe(`granted to a user having a single role:`, () => {
        const user = USERS.employee1;
        const ownResourceId = user.id * 100;

        describe(`on action granted with both 'own' & 'any' possession:`, () => {
          const action = 'list';
          const anyAttributes = ['title', 'createDate'];
          const ownAttributes = ['*'];
          const ownPickedAttributes = [
            // from EMPLOYEE
            'title',
            'content',
            'views',
            'likes',
            'publishDate',
            'createDate',
            'revision',
            'deletedAt',
            'withLimits',
            'confidential',
          ];

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });

            // for sanity
            expect(await permit.isOwn(ownResourceId)).toEqual(true);
            expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
          });

          describe(`Permit::attributes():`, () => {
            it(`returns anyAttributes if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual(anyAttributes);
              expect(permit.anyAttributes).toEqual(anyAttributes);
            });

            it(`returns anyAttributes if NOT own resourceId passed`, async () => {
              expect(await permit.attributes(nonOwnResourceId)).toEqual(anyAttributes);
            });

            it(`returns ownAttributes if own resourceId passed`, async () => {
              expect(await permit.attributes(ownResourceId)).toEqual(ownAttributes);
              expect(permit.ownAttributes).toEqual(ownAttributes);
            });
          });

          describe(`Permit::pick():`, () => {
            it(`returns anyAttributes if when no resourceId passed`, async () => {
              await pickAndCheckEqualSet(permit, aResourceItem, null, anyAttributes);
            });

            it(`returns ownAttributes if when no resourceId passed`, async () => {
              await pickAndCheckEqualSet(permit, aResourceItem, ownResourceId, ownPickedAttributes);
            });
          });

          describe(`Permit::filterPick():`, () => {});
        });

        describe(`on action granted only with 'own' possession:`, () => {
          const action = 'read';
          const ownAttributes = ['*', '!price', '!confidential'];

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });

            // sanity
            expect(await permit.isOwn(ownResourceId)).toEqual(true);
            expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
            expect(await permit.anyGranted).toEqual(false);
            expect(await permit.ownGranted).toEqual(true);
          });

          describe(`Permit::attributes():`, () => {
            it(`returns [] if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual([]);
            });

            it(`returns [] if NOT own resourceId passed`, async () => {
              expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit.attributes(nonOwnResourceId)).toEqual([]);
              expect(permit.anyAttributes).toEqual([]);
            });

            it(`returns ownAttributes if own resourceId passed`, async () => {
              expect(await permit.isOwn(ownResourceId)).toEqual(true);
              expect(await permit.attributes(ownResourceId)).toEqual(ownAttributes);
              expect(permit.ownAttributes).toEqual(ownAttributes);
            });
          });

          describe(`Permit::pick():`, () => {});

          describe(`Permit::filterPick():`, () => {});
        });

        describe(`on action granted only with 'any' possession:`, () => {
          let permit2: Permit;
          const action = 'browse';
          const anyAttributes = ['title', 'content'];

          beforeAll(async () => {
            permit2 = await permissions.grantPermit({
              user,
              resource: 'document',
              action,
            });
          });

          describe(`Permit::attributes():`, () => {
            it(`permit.ownAttributes is equal to anyAttributes`, () => {
              expect(permit2.ownAttributes).toEqual(anyAttributes);
            });

            it(`returns anyAttributes if no resourceId passed`, async () => {
              expect(await permit2.attributes()).toEqual(anyAttributes);
            });

            it(`returns anyAttributes if NOT own resourceId passed`, async () => {
              expect(await permit2.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit2.attributes(nonOwnResourceId)).toEqual(anyAttributes);
            });

            it(`returns anyAttributes even if own resourceId passed`, async () => {
              expect(await permit2.isOwn(ownResourceId)).toEqual(true);
              expect(await permit2.attributes(ownResourceId)).toEqual(anyAttributes);
            });
          });

          describe(`Permit::pick():`, () => {});

          describe(`Permit::filterPick():`, () => {});
        });
      });

      describe(`granted to a user having multiple roles:`, () => {
        const user = USERS.employeeAndSuperAdmin8;
        const ownResourceId = user.id * 100;

        describe(`on action granted with both 'own' & 'any' possession, by diff roles:`, () => {
          const action = 'delete';
          const anyAttributes = ['deletedAt']; // from SUPER_ADMIN
          const ownAttributes = ['*']; // from EMPLOYEE
          const ownPickedAttributes = [
            // from EMPLOYEE
            'title',
            'content',
            'views',
            'likes',
            'publishDate',
            'createDate',
            'revision',
            'deletedAt',
            'withLimits',
            'confidential',
          ];

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });
          });

          describe(`Permit::attributes():`, () => {
            it(`returns anyAttributes if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual(anyAttributes);
            });

            it(`returns anyAttributes if NOT own resourceId passed`, async () => {
              expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit.attributes(nonOwnResourceId)).toEqual(anyAttributes);
            });

            it(`returns ownAttributes if own resourceId passed`, async () => {
              expect(await permit.isOwn(ownResourceId)).toEqual(true);
              expect(await permit.attributes(ownResourceId)).toEqual(ownAttributes);
            });
          });

          describe(`Permit::pick():`, () => {
            describe(`picks anyAttributes`, () => {
              it(`when no resourceId passed`, async () => {
                await pickAndCheckEqualSet(permit, aResourceItem, null, anyAttributes);
              });

              it(`when an non own resourceId passed as 2nd param`, async () => {
                await pickAndCheckEqualSet(permit, aResourceItem, nonOwnResourceId, anyAttributes);
              });

              it(`when an non own resourceId passed as resourceItem.id`, async () => {
                await pickAndCheckEqualSet(
                  permit,
                  { ...aResourceItem, id: nonOwnResourceId },
                  null,
                  anyAttributes
                );
              });

              it(`when an non own resourceId passed as 2nd param, even if resourceItem.id is own`, async () => {
                await pickAndCheckEqualSet(
                  permit,
                  { ...aResourceItem, id: ownResourceId },
                  nonOwnResourceId,
                  anyAttributes
                );
              });
            });

            describe(`picks ownAttributes`, () => {
              it(`when own resourceId passed as 2nd param`, async () => {
                await pickAndCheckEqualSet(
                  permit,
                  aResourceItem,
                  ownResourceId,
                  ownPickedAttributes
                );
              });

              it(`when own resourceId passed as resourceItem.id`, async () => {
                await pickAndCheckEqualSet(permit, { ...aResourceItem, id: ownResourceId }, null, [
                  ...ownPickedAttributes,
                  'id',
                ]);
              });

              it(`when own resourceId passed as 2nd param, even if resourceItem.id isnt own`, async () => {
                await pickAndCheckEqualSet(
                  permit,
                  { ...aResourceItem, id: nonOwnResourceId },
                  ownResourceId,
                  [...ownPickedAttributes, 'id']
                );
              });
            });
          });

          describe(`Permit::filterPick():`, () => {
            it(`returns a mapped array of all items, picking the right attributes for each item, based on ownership passed as resourceItem.id`, async () => {
              await filterPickAndCheckEqualSet(
                permit,
                [
                  createItemWithId(resourceItemKeys, ownResourceId / 10),
                  createItemWithId(resourceItemKeys, nonOwnResourceId),
                  createItemWithId(resourceItemKeys, ownResourceId),
                  createItemWithId(resourceItemKeys, nonOwnResourceId * 10),
                ],
                [
                  createItemWithId(ownPickedAttributes, ownResourceId / 10),
                  createItemWithId(anyAttributes, nonOwnResourceId, false),
                  createItemWithId(ownPickedAttributes, ownResourceId),
                  createItemWithId(anyAttributes, nonOwnResourceId * 10, false),
                ]
              );
            });
          });
        });

        describe(`on action granted only with 'own' possession, only on one Role:`, () => {
          const action = 'publish';
          const ownAttributes = ['title', 'content', 'createDate'].sort(); // from EMPLOYEE

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });
          });

          describe(`Permit::pick():`, () => {
            it(`returns [] if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual([]);
            });

            it(`returns [] if NOT own resourceId passed`, async () => {
              expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit.attributes(nonOwnResourceId)).toEqual([]);
            });

            it(`returns ownAttributes if own resourceId passed`, async () => {
              expect(await permit.isOwn(ownResourceId)).toEqual(true);
              expect(await permit.attributes(ownResourceId)).toEqual(ownAttributes);
            });
          });

          describe(`Permit::pick():`, () => {});

          describe(`Permit::filterPick():`, () => {});
        });

        describe(`on action granted only with 'own' possession on one Role, but 'any' on another with diff attributes:`, () => {
          const action = 'list';
          const mergedAnyAttributes = ['*', '!confidential'];
          const anyPickedAttributes = [
            'title',
            'content',
            'views',
            'likes',
            'publishDate',
            'createDate',
            'revision',
            'deletedAt',
            'withLimits',
          ];
          const ownPickedAttributes = [...anyPickedAttributes, 'confidential'];

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });
          });

          describe(`Permit::attributes():`, () => {
            it(`returns mergedAnyAttributes of both roles for any if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual(mergedAnyAttributes);
            });

            it(`returns mergedAnyAttributes of both roles if NOT own resourceId passed`, async () => {
              expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit.attributes(nonOwnResourceId)).toEqual(mergedAnyAttributes);
            });

            it(`returns own attributes from EMPLOYEE role which override all others, if own resourceId passed`, async () => {
              expect(await permit.isOwn(ownResourceId)).toEqual(true);
              expect(await permit.attributes(ownResourceId)).toEqual(['*']);
            });
          });

          describe(`Permit::pick():`, () => {});

          describe(`Permit::filterPick():`, () => {
            it(`filters all items & picks mergedAttributes`, async () => {
              await filterPickAndCheckEqualSet(
                permit,
                [
                  createItemWithId(resourceItemKeys, ownResourceId / 10),
                  createItemWithId(resourceItemKeys, nonOwnResourceId),
                  createItemWithId(resourceItemKeys, ownResourceId),
                  createItemWithId(resourceItemKeys, nonOwnResourceId * 10),
                  createItemWithId(resourceItemKeys, null, false),
                ],
                [
                  createItemWithId(ownPickedAttributes, ownResourceId / 10),
                  createItemWithId(anyPickedAttributes, nonOwnResourceId),
                  createItemWithId(ownPickedAttributes, ownResourceId),
                  createItemWithId(anyPickedAttributes, nonOwnResourceId * 10),
                  createItemWithId(anyPickedAttributes, null, false),
                ]
              );
            });
          });
        });

        describe(`on action granted only with 'any' possession, by both roles, with diff attributes:`, () => {
          const action = 'browse';
          const anyAttributesEmployee = ['title', 'content'];
          const anyAttributesSuperAdmin = ['title', 'content', 'views', 'likes'];
          const mergedAttributes = _.uniq([
            ...anyAttributesEmployee,
            ...anyAttributesSuperAdmin,
          ]).sort();

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });
          });

          describe(`Permit::pick():`, () => {
            it(`returns mergedAttributes if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual(mergedAttributes);
            });

            it(`returns mergedAttributes if NOT own resourceId passed`, async () => {
              expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit.attributes(nonOwnResourceId)).toEqual(mergedAttributes);
            });

            it(`returns mergedAttributes even if own resourceId passed`, async () => {
              expect(await permit.isOwn(ownResourceId)).toEqual(true);
              expect(await permit.attributes(ownResourceId)).toEqual(mergedAttributes);
            });
          });

          describe(`Permit::pick():`, () => {});

          describe(`Permit::filterPick():`, () => {
            it(`filters all items & picks mergedAttributes`, async () => {
              await filterPickAndCheckEqualSet(
                permit,
                [
                  createItemWithId(resourceItemKeys, ownResourceId / 10),
                  createItemWithId(resourceItemKeys, nonOwnResourceId),
                  createItemWithId(resourceItemKeys, ownResourceId),
                  createItemWithId(resourceItemKeys, nonOwnResourceId * 10),
                  createItemWithId(resourceItemKeys, null, false),
                ],
                [
                  createItemWithId(mergedAttributes, ownResourceId / 10, false),
                  createItemWithId(mergedAttributes, nonOwnResourceId, false),
                  createItemWithId(mergedAttributes, ownResourceId, false),
                  createItemWithId(mergedAttributes, nonOwnResourceId * 10, false),
                  createItemWithId(mergedAttributes, null, false),
                ]
              );
            });
          });
        });

        describe(`on action granted only with 'own' possession, by both roles, with diff attributes:`, () => {
          const action = 'share';
          const ownAttributesEmployee = ['title', 'content', 'publishDate'];
          const ownAttributesSuperAdmin = [
            'title',
            'content',
            'publishDate',
            'createDate',
            'revision',
          ];
          const mergedAttributes = _f.flow(
            _f.uniq,
            _f.sortBy(_f.identity)
          )([...ownAttributesEmployee, ...ownAttributesSuperAdmin]);

          beforeAll(async () => {
            permit = await permissions.grantPermit({
              user,
              action,
              resource: 'document',
            });
          });

          describe(`Permit::attributes():`, () => {
            it(`returns [] if no resourceId passed`, async () => {
              expect(await permit.attributes()).toEqual([]);
            });

            it(`returns [] if NOT own resourceId passed`, async () => {
              expect(await permit.isOwn(nonOwnResourceId)).toEqual(false);
              expect(await permit.attributes(nonOwnResourceId)).toEqual([]);
            });

            it(`returns mergedAttributes even if own resourceId passed`, async () => {
              expect(await permit.isOwn(ownResourceId)).toEqual(true);
              expect(await permit.attributes(ownResourceId)).toEqual(mergedAttributes);
            });
          });

          describe(`Permit::pick():`, () => {});

          describe(`Permit::filterPick():`, () => {
            it(`filters only own items & picks merged ownAttributes`, async () => {
              await filterPickAndCheckEqualSet(
                permit,
                [
                  createItemWithId(resourceItemKeys, ownResourceId / 10),
                  createItemWithId(resourceItemKeys, nonOwnResourceId),
                  createItemWithId(resourceItemKeys, ownResourceId),
                  createItemWithId(resourceItemKeys, nonOwnResourceId * 10),
                  createItemWithId(resourceItemKeys, null, false),
                ],
                [
                  createItemWithId(mergedAttributes, ownResourceId / 10, false),
                  createItemWithId(mergedAttributes, ownResourceId, false),
                ]
              );
            });
          });
        });
      });
    });
  });
});
