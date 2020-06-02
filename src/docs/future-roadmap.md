# Future Roadmap

In the future, SuperAwesome Permissions aims to improve around these objectives:

**Note**: these Release numbers dont correspond to package module versions that follow [semantic versioning](https://semver.org/) (see readme.md).

## Release #1 (current)

#### Native support

We will welcome & aid the community to develop native Plugins / Middleware / Decorators / Guards etc for **expressjs, koa, GraphQL / Apollo, Loopback, Angular, React, Vue** & more...

#### Core features

- Fix serious bugs & shortcomings reported by users 

- Fix of Caveats #1 "Leaky Actions" & #2 "Merged own Attributes of multiple roles"

- Validations for PermissionsDefinitions, PermitGrantQuery etc using class-validator.

- Improved & more tests 

- Freeze features unless really needed.

#### Extras & docs

- Improve typings 

- Better documents & generated doc tests

- Add missing docs & some helpers around PermissionDefinition consolidations ( i.e see `consolidations.ts` & `getDefinitions()`).

## Release #2

- Split the `addDefinitions()` and `.grantPermit()` parts to 2 different classes / instances (currently both live in `Permissions`).

- Improve integration tests around features rather than "role X can do this" etc.

- Fix any bugs & shortcomings from R1.

- Deprecating `listOwn()` would be too drastic. And it might have some good use cases also. So we'll make it optional, while `limitOwn` will be the mandatory. We can even auto-generate `listOwn` & `isOwner`/`isOwn`, if user gives us a way query over the resource item IDs (i.e query the DB) using given `limitOwn()`.

## Release #3

- Investigate **Custom Possessions**:

  - Possessions are defined by developers (and even end users with some help from devs) and can be completely programmable & arbitrary. They can be domain specific but also generalized within your service.
    They can be anything from `"own", "purchased", "created", "company", "department", "guild", "team", "project", "country", "confidential"` up to `"userHasParticipatedInOurLastChristmasBallAfterParty"` so they can see the exclusive photos ;-) You get the idea!

  - Imaginary definition and usage looks trivial & very close to SuperAwesome Permissions R1 philosophy. Imagine:

  ```js
  // PermissionDefinition R3 - imaginary :-)
  const permissionDefinition = {
    ...,
    possessions: {
      own: ({ user, resourceId }) =>
        hasUserPurchasedResource({ user, resourceId }),
      project: ({ user, resourceId }) =>
        isUserInSameProjectAsTheDocument({ user, documentId: resourceId }),
      company: ({ user, resourceId }) =>
        isUserInSameCompanyAsTheDocument({ user, documentId: resourceId }),
    },
    grant: {
      'list:own': ['*'],
      'list:project': ['*', '!confidential'],
      'list:company': ['title', 'date'],
    },
  };

  await permit.is('own')(documentId);     // true / false depending on above
  await permit.is('company')(documentId); // true / false depending on above
  docs.filter(permit.limit('own'));       // filters documents according to "own" possession only
  docs.filter(permit.limit('company'));   // filters documents according to "own" possession only
  docs.filter(permit.limit());            // filters documents all possessions effective for user.

  await permit.mapPick(docs.filter(permit.limit())); // a list of all documents allowed by each possession, but only with the allowed attributes depending on the positively evaluated possession rules.
  ```

- Investigate "extend" of Roles - currently disabled. Implement if successful.

- Investigate whether "deny" (i.e the opposite of `grant: TGrants`) has any valid use cases, especially if extend is implemented.