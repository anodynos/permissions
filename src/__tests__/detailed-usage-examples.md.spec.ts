/* eslint-disable-next-line eslint-comments/disable-enable-pair */
/* eslint-disable prefer-template,no-useless-escape */
import * as _ from 'lodash';
import * as _f from 'lodash/fp';
import * as upath from 'upath';

import { code, DO_NOT_EDIT_NOTICE, docs, joinAll, noJestRunner } from './utils/test.utils';
import { pOTS } from './utils/pOTS';
import { Permissions } from '../Permissions';
import { Permit } from '../Permit.class';
import { permissionDefinitions_examples } from './permissionDefinitions-examples.fixtures';

noJestRunner();

const permissions = new Permissions({
  permissionDefinitionDefaults: { resource: 'document' },
  permissionDefinitions: permissionDefinitions_examples,
}).build();

const newSaPermissionsTxt = `
  const permissions = new Permissions({
    permissionDefinitionDefaults: { resource: 'document' },
    permissionDefinitions: ${pOTS(permissionDefinitions_examples).replace(/exports./g, '')}
  }).build();`;

describe(
  DO_NOT_EDIT_NOTICE(upath.relative(__dirname, __filename)) +
    '\n' +
    joinAll(
      docs(`
# Detailed Usage & Examples

Let's look at some examples, so we can better guide the discussion.

### Hypothetical Schema

All examples use a simple schema that entails:

* A **Document** is created by a **User**.

* A **User** belongs to one **Company** (and a **Company** has many **Users**)

* A **User** (as manager) manages zero or more **Users**

Note: our mock data layer resides in file \`data.fixtures.ts\`.

### Roles and their CRUD Rules:

Now consider the following simple Permissions (i.e our business rules, expressed as plain English), based on the above schema:

${permissionDefinitions_examples.map((pd) => pd.descr).join('\n\n')}

We see that most Roles (and hence Users with these Roles) can perform different sets of actions on **Documents** they somehow "own".

But the definition of *ownership* in our apps are arbitrary - it can be "Documents created by users of my company", or "Documents created by users I manage" or it could be any particular business rule such as ["users that are friends" etc](https://github.com/onury/accesscontrol/issues/46#issue-330937936).

We define these ownership definitions as "ownership hooks", by defining [\`isOwner\`](/classes/PermissionDefinition_DOCS.html#isOwner) and either [\`listOwned\`](/classes/PermissionDefinition_DOCS.html#listOwned) or  [\`limitOwned\`](/classes/PermissionDefinition_DOCS.html#limitOwned) functions for each PermissionDefinition that has "own" possession rules.`),
      docs(`


# 1. Adding PermissionDefinitions & build()

With that in mind, lets convert the above "human permissions / business rules" into [**PermissionDefinitions**](/classes/PermissionDefinition_DOCS.html):`),
      code(newSaPermissionsTxt),
      docs(`Its a good practice to keep the human description close in the PD & keep them in sync.`)
    ),

  () => {
    const expectedOwnDocumentIds = [1, 10, 100];
    const nonOwnedDocument = {
      id: 999,
      title: 'Document 999 title',
      date: '1920-02-19',
      confidential: '999 secrets lie here',
      someRandomField: 'Some random 999 value',
    };
    const ownedDocument = {
      id: 100,
      title: 'Document 100 title',
      date: '2020-02-19',
      confidential: '100 secrets lie here',
      someRandomField: 'Some random 100 value',
    };
    const expectedPickedOwnDocument = _.omit(ownedDocument, 'confidential');
    const documentsList = [nonOwnedDocument, ownedDocument];

    describe(
      docs(`
# 2. Granting Permissions

We can now start **Granting Permissions**, i.e \`grantPermit()\`.

### Example 1

Lets grant permit of a simple EMPLOYEE user to "read" a document.`),
      () => {
        const grantPermitQuery = {
          user: { id: 1, roles: ['EMPLOYEE'] },
          action: 'read',
          resource: 'document',
        };
        const expectedDocumentsOfFilterPick = [expectedPickedOwnDocument];

        let permit: Permit;
        beforeAll(async () => (permit = await permissions.grantPermit(grantPermitQuery)));

        describe(
          joinAll(
            code(`const permit = await permissions.grantPermit(${pOTS(grantPermitQuery)});`),
            docs(`which gives us a [Permit](/classes/Permit.html) object we can use in our app:\n`)
          ),
          () => {
            it(code(`permit.granted === true`), () => expect(permit.granted).toBe(true));
            it(code(`permit.anyGranted === false`), () => expect(permit.anyGranted).toBe(false));
            it(code(`permit.ownGranted === true`), () => expect(permit.ownGranted).toBe(true));
          }
        );

        describe(
          docs(`
## Basic Permissions - Ownership only

We see that this user has ONLY **own** access granted for this action "read", so they can't access any random resource item.

**Important: In your app you MUST offer only the resource items allowed for each permit, so [when ONLY own access is granted you MUST check the actual possession](https://github.com/onury/accesscontrol/issues/14#issuecomment-328316670) and start filtering.**

We need to handle a) check one item's onwership and b) retrieve a filtered list of many own items.`),
          () => {
            it(
              joinAll(
                docs(`

## permit.isOwn()

Lets check if a particular documentId is owned by this user:`),
                code(`await permit.isOwn(100) === true`),
                code(`await permit.isOwn(200) === false`)
              ),
              async () => {
                expect(await permit.isOwn(100)).toStrictEqual(true);
                expect(await permit.isOwn(200)).toStrictEqual(false);
              }
            );

            it(
              joinAll(
                docs(`
## permit.listOwn()

Lets now handle the set of documents owned by the user: there are 2 ways of achieving this, and it depends on your service.

The simplest (but not so scalable) is the one we used in our PDs above, the eager [\`listOwned\` & \`listOwn()\`](/classes/Permit.html#listOwn) way.

But also check the lazy [\`limitOwned\` & \`limitOwn()\`](/classes/Permit.html#limitOwn) way, if you plan to scale. The 2 are not compatible and cant be mixed (in the same resource), so choose wisely!

Using [\`listOwn()\`](/classes/Permit.html#listOwn) we get a FULL list of \`documentIds\` that are "owned" by this user:`),
                code(`await permit.listOwn(); \n// equals \n[${expectedOwnDocumentIds.join(', ')}]`)
              ),
              async () => expect(await permit.listOwn()).toStrictEqual(expectedOwnDocumentIds)
            );
          }
        );

        describe(
          docs(`
# 3. Filtering & Picking the right objects

**Important: In your service you MUST always be picking your resource items, before you return them**.

PermissionDefinitions & Permit decide what objects the calling app will receive, irrespective of \`permit.anyGranted\` being true/false (see reason in Example 2).

Its a good practice to pick just before sending the Output DTO object to the calling app.

## permit.attributes()
`),
          () => {
            it(
              joinAll(
                docs(`
First lets see what attributes we can access from an "own" document.`),
                code(`
await permit.attributes(100); \n// equals \n['*', '!confidential']`),
                docs(`
We get the allowed attributes for an own document for this user, i.e all attributes except \`'confidential'\`.`)
              ),
              async () => {
                expect(await permit.attributes(100)).toStrictEqual(['*', '!confidential']);
              }
            );

            it(
              joinAll(
                docs(`
Now lets see what we get from any random Document object.`),
                code(`
await permit.attributes(); \n// equals \n[]`),
                code(`
await permit.attributes(200); \n// equals \n[]`),
                docs(`
No attributes allowed! Why did that happen?

Because we DONT own these random documents, we shouldn't be accessing them at all. Even if we try to return a document not owned (which we should not anyway), the \`permit.pick()\` operation below will give you an empty object.`)
              ),
              async () => {
                expect(await permit.attributes()).toStrictEqual([]);
                expect(await permit.attributes(200)).toStrictEqual([]);
              }
            );

            it(
              joinAll(
                docs(
                  `
## permit.pick()

The \`permit.attributes()\` is not very useful, you basically want to "pick" only the allowed attributes & values.

This is what  \`permit.pick()\` does, similarly to lodash \`_.pick\`, but with the allowed attributes baked in.

### Owned

Passing an own document, we get only all the allowed attributes (including \`'someRandomField'\` since we have the "*" in our definition, but without \`'confidential'\`) :`
                ),
                code(
                  `await permit.pick(${pOTS(ownedDocument)}); \n// equals \n${pOTS(
                    expectedPickedOwnDocument
                  )}`
                )
              ),
              async () => {
                expect(await permit.pick(ownedDocument)).toStrictEqual(expectedPickedOwnDocument);
              }
            );

            it(
              joinAll(
                docs(`
### Not owned

But passing an non-owned document, we will get an empty object:`),
                code(`await permit.pick(${pOTS(nonOwnedDocument)}); \n// equals \n({})`)
              ),
              async () => {
                expect(await permit.pick(nonOwnedDocument)).toStrictEqual({});
              }
            );

            it(
              joinAll(
                docs(
                  `
# Helpers to filter, pick & map

\`Permit\` has some useful helpers, which handle internally the async nature of ownership hooks and thus can save you some frustration.

## permit.filterPick()

For example what if we are handling an array of Documents and we want to a) filter out non-owned ones and b) pick attributes of the owned ones?`
                ),
                code(
                  `await permit.filterPick(${pOTS(documentsList)});\n// equals\n${pOTS(
                    expectedDocumentsOfFilterPick
                  )}`
                ),
                docs(
                  `Note: ideally you should be filtering your data layer before you reach here, and this is where \`listOwn()\` & \`limitOwn()\` come in. `
                )
              ),
              async () => {
                expect(await permit.filterPick(documentsList)).toStrictEqual(
                  expectedDocumentsOfFilterPick
                );
              }
            );

            const docProjectTo = (doc) => ({
              ...doc,
              title: doc.title.toUpperCase(),
              someNewField: 'Some new value',
            });
            const expectedDocumentsOfMapPick = [
              {},
              ...expectedDocumentsOfFilterPick.map(docProjectTo),
            ];

            it(
              joinAll(
                docs(
                  `
## permit.mapPick()

Another helper is [\`permit.mapPick()\`](/classes/Permit.html#mapPick), which is not filtering but only does a mapping and attributes picking:`
                ),
                code(
                  `await permit.mapPick(${pOTS(documentsList)}, doc => ({
                      ...doc,
                      title: doc.title.toUpperCase(),
                      someNewField: 'Some new value',
                    }));\n// equals\n${pOTS(expectedDocumentsOfMapPick)}`
                ),
                docs(`It returns an empty object for documents that aren't owned`)
              ),
              async () => {
                expect(await permit.mapPick(documentsList, docProjectTo)).toStrictEqual(
                  expectedDocumentsOfMapPick
                );
              }
            );
          }
        );
      }
    );

    describe(
      docs(`
# 4. Let SuperAwesome Permissions & PermissionDefinitions shape your App's data

### Example 2

With the same EMPLOYEE user, lets grant permit for "list" action this time.

We see that the PD has both "list:own" & "list:any", with different set of attributes (i.e for non-own documents, I can only read title & date).`),
      () => {
        const grantPermitQuery = {
          user: { id: 1, roles: ['EMPLOYEE'] },
          action: 'list',
          resource: 'document',
        };

        let permit: Permit;
        beforeAll(async () => (permit = await permissions.grantPermit(grantPermitQuery)));

        describe(
          joinAll(
            code(`
              const permit = await permissions.grantPermit(${pOTS(grantPermitQuery)});
            `)
          ),
          () => {
            it(
              joinAll(
                docs(`We indeed have "any":`),
                code(`permit.anyGranted && permit.ownGranted === true`)
              ),
              () => {
                expect(permit.anyGranted).toBe(true);
                expect(permit.ownGranted).toBe(true);
              }
            );

            const expectedPickedNONOwnDocument = _.pick(nonOwnedDocument, ['title', 'date']);
            const expectedDocumentsOfMapPick = [
              expectedPickedNONOwnDocument,
              expectedPickedOwnDocument,
            ];
            it(
              joinAll(
                docs(
                  `
#### Why you should be picky

Just having "list:any" access doesnt mean all Documents are created equally:`
                ),
                code(
                  `await permit.mapPick(${pOTS(documentsList)});\n// equals\n${pOTS(
                    expectedDocumentsOfMapPick
                  )}`
                )
              ),
              async () => {
                expect(await permit.mapPick(documentsList)).toStrictEqual(
                  expectedDocumentsOfMapPick
                );
              }
            );

            it(
              joinAll(
                docs(
                  `
#### Now the Question: to filterPick or not to filterPick?

How should \`permit.filterPick\` behave? Think for a minute.

Well, it should give the same result as \`permit.mapPick()\` (without a \`projectTo\`), cause  **filterPick should filter out non-own items, only when we DONT HAVE "any" access**.

But this time we do, so it should respect that:`
                ),
                code(
                  `await permit.filterPick(${pOTS(documentsList)});\n// equals\n${pOTS(
                    expectedDocumentsOfMapPick
                  )}`
                )
              ),
              async () => {
                expect(await permit.filterPick(documentsList)).toStrictEqual(
                  expectedDocumentsOfMapPick
                );
              }
            );

            it(
              joinAll(
                docs(
                  `
#### Pick has your back

It follows that \`permit.pick\` behaves similarly, picking different attributes for "own" and "non-own" items, when "any" is granted:`
                ),
                docs('# Picking Own'),
                code(
                  `await permit.pick(${pOTS(ownedDocument)});\n// equals\n${pOTS(
                    expectedPickedOwnDocument
                  )}`
                ),
                docs('# Picking non-own, using any'),
                code(
                  `await permit.pick(${pOTS(nonOwnedDocument)});\n // equals\n${pOTS(
                    expectedPickedNONOwnDocument
                  )}`
                )
              ),
              async () => {
                expect(await permit.pick(ownedDocument)).toStrictEqual(expectedPickedOwnDocument);
                expect(await permit.pick(nonOwnedDocument)).toStrictEqual(
                  expectedPickedNONOwnDocument
                );
              }
            );
          }
        );
      }
    );

    describe(
      docs(`
# 5. A User with many Roles

Users can have many roles. The mantra with multiple roles is:

> A User with multiple roles, can do whatever **each role could do individually**, but NO MORE or NO LESS than that.

This principle should be followed by your roles & PermissionDefinitions as well. SuperAwesome Permissions follows this mantra, but there are some [caveats](/additional-documentation/faq,-gotchas-&-caveats.html) in the current version (to be fixed soon).
`),
      () => {
        describe(
          docs(`
## Example 3 - Action merging

If one Role grants an action, action is granted with the greatest possible **possession** in any of the grants (where any > own).
        `),
          () => {
            const permitGrantQuery = {
              user: { id: 2, roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'] },
              action: 'create',
              resource: 'document',
            };
            it(
              joinAll(
                code(`
                 const permit = await permissions.grantPermit(${pOTS(permitGrantQuery)});

                 permit.ownGranted === true;   // from EMPLOYEE role
                 permit.anyGranted === false;  // would be true only if some role had it
             `)
              ),
              async () => {
                const permit = await permissions.grantPermit(permitGrantQuery);
                expect(permit.ownGranted).toBe(true);
                expect(permit.anyGranted).toBe(false);
              }
            );
          }
        );

        describe.each([
          [['EMPLOYEE'], [2, 20, 200]],
          [['EMPLOYEE_MANAGER'], [2, 20, 200, 1, 10, 100, 4, 40, 400]],
          [['COMPANY_ADMIN'], [1, 10, 100, 2, 20, 200, 3, 30, 300, 7, 70, 700]],
          [
            ['EMPLOYEE_MANAGER', 'COMPANY_ADMIN'],
            [2, 20, 200, 1, 10, 100, 4, 40, 400, 3, 30, 300, 7, 70, 700],
          ],
        ])(
          docs(`
## Ownership evaluation merging

### Shared action

When handling one or many items with \`permit.isOwn\`, \`permit.listOwn\` or \`permit.limitOwn\`, the Permit will consider as "owned" the union of all resourceIds owned by each role that has the specific action.

Consider these different \`grantPermit()\` cases for the \`action: 'read\` , always for same **User with id: 2**, but with different roles in each attempted case, where all roles have the "read" action granted:`),
          (roles, expectedOwnResourceIds) => {
            const permitGrantQuery = {
              user: { id: 2, roles },
              action: 'read',
              resource: 'document',
            };
            let permit: Permit;

            beforeEach(async () => {
              permit = await permissions.grantPermit(permitGrantQuery);
            });

            it(
              joinAll(
                docs(`#### With role(s) ${roles.join(', ')} we get:`),
                code(
                  `
permit = await permissions.grantPermit(${pOTS(permitGrantQuery)});

await permit.listOwn();\n// equals\n${pOTS(expectedOwnResourceIds)} ${
                    roles.length > 1 ? '// merged - union of all owned hooks on all roles' : ''
                  }`
                ),
                roles.length > 1 ? docs(``) : ''
              ),
              async () => {
                expect(await permit.listOwn()).toStrictEqual(expectedOwnResourceIds);
              }
            );
          }
        );

        describe.each([
          [['EMPLOYEE_MANAGER'], [2, 20, 200, 1, 10, 100, 4, 40, 400]],
          [['COMPANY_ADMIN'], false],
          [
            ['EMPLOYEE_MANAGER', 'COMPANY_ADMIN'],
            [2, 20, 200, 1, 10, 100, 4, 40, 400],
          ],
        ])(
          docs(`
### Not shared action

If the action is not shared among the different roles (in different PDs), then **only the ownerships in PDs that have this action** come into play.

Consider the following cases for the \`action:'delete'\` this time, again for same **User with id: 2**, where only the EMPLOYEE_MANAGER role has the "delete" action granted:`),
          (roles, expectedOwnResourceIds) => {
            const permitGrantQuery = {
              user: { id: 2, roles },
              action: 'delete',
              resource: 'document',
            };
            let permit: Permit;

            beforeEach(async () => {
              permit = await permissions.grantPermit(permitGrantQuery);
            });

            it(
              joinAll(
                docs(`#### With role(s) ${roles.join(', ')} we get:`),
                code(
                  `
permit = await permissions.grantPermit(${pOTS(permitGrantQuery)});

expect(permit.granted).toBe(${!!expectedOwnResourceIds});
expect(permit.anyGranted).toBe(false);
expect(permit.ownGranted).toBe(${!!expectedOwnResourceIds});
await permit.listOwn();\n ${
                    !expectedOwnResourceIds
                      ? '// Throws exception since even `permit.granted` is false'
                      : '// equals\n' + pOTS(expectedOwnResourceIds)
                  } ${
                    roles.length > 1
                      ? '// only the EMPLOYEE_MANAGER ownership is active for delete action'
                      : ''
                  }`
                ),
                roles.length > 1
                  ? joinAll(
                      docs(
                        `
In the real world this translates to

> An EMPLOYEE_MANAGER managing a team of People can **delete** their documents. But a COMPANY_MANAGER can NOT **delete** company documents.

Therefore company documents are secured from being deleted, unlike the team's:`
                      ),
                      code(`
// an EMPLOYEE_MANAGER document
await permit.isOwn(100) === true`),
                      code(
                        `
// a COMPANY_ADMIN document, not considered as owned for **delete** action
await permit.isOwn(700) === false`
                      )
                    )
                  : ''
              ),
              async () => {
                if (!expectedOwnResourceIds) {
                  expect(permit.granted).toBe(false);
                  expect(permit.ownGranted).toBe(false);
                  expect(permit.anyGranted).toBe(false);
                  expect(permit.grantedAction).toBe(false);
                  await expect(permit.listOwn()).rejects.toThrow(/SA-Permissions/);
                  expect(() => permit.limitOwn()).toThrow(/SA-Permissions/);
                } else {
                  expect(permit.granted).toBe(true);
                  expect(permit.ownGranted).toBe(true);
                  expect(permit.anyGranted).toBe(false);
                  expect(await permit.listOwn()).toStrictEqual(expectedOwnResourceIds);

                  expect(await permit.isOwn(100)).toBe(true);
                  expect(await permit.isOwn(700)).toBe(false);
                }
              }
            );
          }
        );
      }
    );

    describe(
      docs(`
## Example 4 - Over-optimistic attributes merging for own resources on multiple roles (see Caveat #2)

Attributes from all roles are merged as a union optimistically. This means that if any one Role can access an attribute, then the user can access it. This sounds right, until we think of ownership: the rule applies **irrespective of the role that contributed to owning a resource** which is problematic :-(

Consider this example:
        `),
      () => {
        const permitGrantQuery = {
          user: { id: 2, roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER'] },
          action: 'list',
          resource: 'document',
        };

        const expectedAnyAttributes = ['date', 'status', 'title'];
        const expectedEmployeeOwnAttributes = ['*', '!confidential'];
        const expectedEmployeeManagerOwnAttributes = ['*', '!confidential', '!personal'];
        it(
          joinAll(
            code(`
const permit = await permissions.grantPermit(${pOTS(permitGrantQuery)});

await permit.attributes();\n// for non-own, its the merged of "any" attributes 'EMPLOYEE' of 'EMPLOYEE_MANAGER', which is expected: \n${pOTS(
              expectedAnyAttributes
            )}`),
            docs(`
We see that for own resources, again we get the merged of "own" attributes of both roles, but really it should depend on the specific ownership:`),
            code(`
await permit.attributes(200);\n// equals CORRECTLY to \n${pOTS(expectedEmployeeOwnAttributes)}`),
            docs(
              `
We see that since ownership for \`resourceId = 200\` is established by both EMPLOYEE & EMPLOYEE_MANAGER roles, it correctly equals to the most optimistic merged attributes.

Now this is the issue: in EMPLOYEE_MANAGER we have an extra restricted attribute \`!personal\`. The real world analogy is that an EMPLOYEE_MANAGER can "read" their employee documents, BUT NOT their "personal" attribute, as we want only the **employee as the creator** to access it. Think of it as some personal information the employee is adding to the doc, but their manager should not be able access it.

Notice now that documentId 400 is only owned by the EMPLOYEE_MANAGER role (and NOT by EMPLOYEE as the creator), i.e it is only the EMPLOYEE_MANAGER role that allows this user to access someones else's created document, hence the "personal" attribute on this particular item should not be accessed!

But lets see:`
            ),
            code(`
            await permit.attributes(400);\n// 400 is owned only by EMPLOYEE_MANAGER, but attributes incorrectly equal to:\n${pOTS(
              expectedEmployeeOwnAttributes
            )} // Attributes should really equal to ${pOTS(expectedEmployeeManagerOwnAttributes)};

            `),
            docs(
              `
It seems that our user inherited an **optimistically merged version of attributes** for all own resources, irrespective of **which role allowed the actual ownership** of the resource.

It means a user with EMPLOYEE_MANAGER + EMPLOYEE together can do more things than EMPLOYEE alone and EMPLOYEE_MANAGER alone. This is contrary to our mantra "no more and no less".

So be aware of this glitch & as in all security tools, test well! The issue will be fixed in a future version of SuperAwesome Permissions.`
            )
          ),
          async () => {
            const permit = await permissions.grantPermit(permitGrantQuery);
            (expect as any)(await permit.attributes()).toIncludeSameMembers(expectedAnyAttributes);

            (expect as any)(await permit.attributes(200)).toIncludeSameMembers(
              expectedEmployeeOwnAttributes
            );

            (expect as any)(await permit.attributes(400)).toIncludeSameMembers(
              expectedEmployeeOwnAttributes
            );
            // // should be
            // (expect as any)(await permit.attributes(400)).toIncludeSameMembers(expectedEmployeeManagerOwnAttributes);
          }
        );
      }
    );

    describe(
      docs(`
# 6. Scaling using \`permit.limitOwn()\`

Make sure you've read [how \`limitOwned\` / \`permit.limitOwn\` works](/classes/Permit.html#limitOwn)

### Example 5 - limitOwn

A simple Array collection using \`limitOwnReduce\` & lodash:`),
      () => {
        /* eslint-disable no-shadow */
        const require = (name) =>
          ({ lodash: _, '@superawesome/permissions': { Permissions } }[name]);
        const example5 = async () => {
          const { Permissions } = require('@superawesome/permissions');
          const _ = require('lodash');
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          const isEven = (n) => n % 2 === 0;
          const isLarge = (n) => n > 7;
          const isUserIdMatchesNumber = async ({ user, resourceId }) => user.id === resourceId;

          // Setting up PermissionDefinitions
          const permissions = new Permissions({
            permissionDefinitions: [
              {
                roles: 'EvenNumbersRole',
                isOwner: async ({ resourceId }) => isEven(resourceId),
                limitOwned: ({ user, context: predicates = [] }) => [isEven, ...predicates],
                grant: ['list'],
              },
              {
                roles: 'LargeNumbersRole',
                isOwner: async ({ resourceId }) => isLarge(resourceId),
                limitOwned: ({ user, context: predicates = [] }) => [isLarge, ...predicates],
                grant: ['list'],
              },
              {
                roles: 'UserIdMatchesNumberRole',
                isOwner: isUserIdMatchesNumber,
                limitOwned: ({ user, context: predicates = [] }) => [
                  (number) => user.id === number,
                  ...predicates,
                ],
                grant: ['list'],
              },
            ],
            permissionDefinitionDefaults: {
              resource: 'numbers',
              possession: 'own',
            },
            limitOwnReduce: ({ user, limitOwneds, context: predicates = [] }) => {
              for (const limitOwned of limitOwneds) {
                predicates = limitOwned({ user, context: predicates });
              }

              return _.overSome(predicates);
            },
          }).build();

          // Granting permit for a given User at runtime, based on the above permissions.
          const permit = await permissions.grantPermit({
            user: {
              id: 1,
              roles: ['EvenNumbersRole', 'LargeNumbersRole', 'UserIdMatchesNumberRole'],
            },
            resource: 'numbers',
            action: 'list',
          });

          return numbers.filter(permit.limitOwn());
        };
        /* eslint-enable no-shadow */
        const expectedResourceIds = [1, 2, 4, 6, 8, 9, 10, 11, 12];

        it(
          joinAll(
            code(`
            // example 5 in action
            await (${pOTS(example5)});\n// equals\n${pOTS(expectedResourceIds)}`)
          ),
          async () => {
            expect(await example5()).toStrictEqual(expectedResourceIds);
          }
        );

        /* eslint-disable no-shadow */
        const example6 = async () => {
          const { Permissions } = require('@superawesome/permissions');
          const _ = require('lodash');
          const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
          const isEven = (n) => n % 2 === 0;
          const isLarge = (n) => n > 7;
          const isUserIdMatchesNumber = async ({ user, resourceId }) => user.id === resourceId;

          // Setting up PermissionDefinitions
          const permissions = new Permissions({
            permissionDefinitions: [
              {
                roles: 'EvenNumbersRole',
                isOwner: async ({ resourceId }) => isEven(resourceId),
                limitOwned: () => isEven,
                grant: ['list'],
              },
              {
                roles: 'LargeNumbersRole',
                isOwner: async ({ resourceId }) => isLarge(resourceId),
                limitOwned: () => isLarge,
                grant: ['list'],
              },
              {
                roles: 'UserIdMatchesNumberRole',
                isOwner: isUserIdMatchesNumber,
                limitOwned: ({ user }) => (number) => user.id === number,
                grant: ['list'],
              },
            ],
            permissionDefinitionDefaults: {
              resource: 'numbers',
              possession: 'own',
            },
            limitOwnReduce: ({ user, limitOwneds }) =>
              _.overSome(limitOwneds.map((limitOwned) => limitOwned({ user }))),
          }).build();

          // Granting permit for a given User at runtime, based on the above permissions.
          const permit = await permissions.grantPermit({
            user: {
              id: 1,
              roles: ['EvenNumbersRole', 'LargeNumbersRole', 'UserIdMatchesNumberRole'],
            },
            resource: 'numbers',
            action: 'list',
          });

          return numbers.filter(permit.limitOwn());
        };
        /* eslint-enable no-shadow */

        it(
          joinAll(
            docs(`
### Example 6

We could simplify Example 5 more, cause if we dont need the \`context\` value, we can just omit it.

So by slightly adjusting our \`limitOwnReduce\` from example 5:

   \`\`\`js
     limitOwnReduce: ({ user, limitOwneds }) => _.overSome(limitOwneds.map(limitOwned => limitOwned({user}))),
   \`\`\`

our \`limitOwned\` callbacks would also become much simpler:

   \`\`\`js
      {
        roles: 'EvenNumbersRole',
        limitOwned: () => isEven,
        ...
      },
      {
        roles: 'LargeNumbersRole',
        limitOwned: () => isLarge,
        ...
      },
      {
        roles: 'UserIdMatchesNumberRole',
        limitOwned: ({ user}) => (number) => user.id === number,
        ...
      }
   \`\`\`

The final code is neater:
`),
            code(`
            // example 6 in action
            await (${pOTS(example6)});\n// equals\n${pOTS(expectedResourceIds)}`)
          ),
          async () => {
            expect(await example6()).toStrictEqual(expectedResourceIds);
          }
        );
      }
    );
  }
);
