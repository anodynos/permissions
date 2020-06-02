# Basic Usage

SuperAwesome Permissions is not opinionated about where & how it is used. It can be used in standalone JS/TS apps, alongside or separately or with OAuth 2.0, in frontend or mobile apps, REST or GraphQL or other and backend apps using vanilla nodejs, ExpressJs, Koa, NestJs as well as any data layer such as SQL, NOSQL, other APIs etc.  

The higher the abstraction of your framework, the better. Our backend framework of choice is [NestJs](http://nestjs.com/) for which specifically we have a sister project with native Guard & Decorators at [permissions-nestjs](http://permissions-nestjs.docs.superawesome.com) that adheres to the Aspect Oriented philosophy of SuperAwesome Permissions. 

You're more than welcome to write your own middleware/plugin etc and share it with the community.

## Installation

To install simply:

  ```bash
  $ npm install @superawesome/permissions --save
  ```

## Import

In CommonJS (old vanilla nodejs) do:

```js
const { Permissions } = require('@superawesome/permissions');
```

On ESx/TS you can import:

```typescript
import { Permissions } from '@superawesome/permissions';
```

## Operation Modes

SuperAwesome Permissions operation is super simple, as it has only 2 main operation modes:

### 1. Adding PermissionDefinitions & build()

> Define & add permissions for **Roles**: what **Actions** they can do on **Resources**.

At the application bootstrap we add all [**PermissionDefinitions**](/classes/PermissionDefinition_DOCS.html) (in short *PDs*) that we need, onto a `Permissions` instance:

  ```typescript
  // create an instance with some initial `permissionDefinitions` & optionally `permissionDefinitionDefaults`:
  const permissions = new Permissions({ permissionDefinitions, permissionDefinitionDefaults });

  // or add as many `permissionDefinitions` as needed to an existing `permissions` instance
  const permissions = new Permissions();
  permissions.addDefinitions({..PD..}, {..PDdefaults..}); // one by one
  permissions.addDefinitions([{..PD1..}, {..PD2..}, ...], {..PDdefaults..}); // multiple
  ```

The `permissionDefinitions` can either be a single [`PermissionDefinition`](/classes/PermissionDefinition_DOCS.html) object or an array of them. You can optionally use [`permissionDefinitionDefaults`](/classes/PermissionDefinitionDefaults.html) to keep it DRY.

Once all [**PermissionDefinitions**](/classes/PermissionDefinition_DOCS.html) are added, we need to `.build()` *before* we start querying it:

  ```typescript
  permissions.build();
  ```
and you can start querying it to *grant permits* (see below).

Note that:

  * before `build()`, you can't call `grantPermit()` (it throws)

  * after `build()`, you can't call  `addDefinitions()` (it throws)

You can do the whole thing in one line:

  ```typescript
  const permissions = new Permissions({ permissionDefinitions, permissionDefinitionDefaults }).build();
  ```

### 2. Granting Permissions

> Can User 123 Read Document 123e4567 ?

At runtime, for a particular **User** (of type [IUser](/interfaces/IUser.html)), with zero or more **Roles** attached, we'll ask the **Permissions** instance to [`grantPermit()`](/classes/Permissions.html#grantPermit) for a specific **Action** on a specific **Resource** (and optionally a **resourceId**). We pack this query as a [`GrantPermitQuery`](/classes/GrantPermitQuery.html):

```typescript
const grantPermitQuery = {
    user: { id: 123, roles: ['EMPLOYEE', 'EMPLOYEE_MANAGER']},
    action: 'read',         // action without ownership, always checks both
    resource: 'document',
    resourceId: '123e4567', // optional, forces to check `permit.isOwn()` for specific resourceId
}
const permit = await permissions.grantPermit(grantPermitQuery); // returns a Promise, so we need to `await` or `.then` it.
```

### 3. Checking ownership, filtering, picking

**Permissions** will respond with a [Permit](/classes/Permit.html) instance that has the all the information the userland app needs.

```typescript
  permit.granted                          // true if action on resource is granted at all

  permit.anyGranted                       // true if action is granted on an **any** or only **own** resources

  await permit.isOwn('8910abc1112')       // true if document '8910abc1112' is owned by User 123.

  await permit.attributes('8910abc1112')  // returns the attributes that can be accessed, depending on ownership of document '8910abc1112'

  await permit.pick({                     // returns a partial clone of the object passed (i.e a resource item),
    id: '8910abc1112',                    // only with the attributes allowed, depending on ownership of 8910abc1112. 
    title: 'Im a Document', ...           // If 8910abc1112 is owned, we'll get the attributes granted by "own" action,   
  })                                      // or "any" if not owned but "any" is granted. 
                                          // Otherwise (worse case scenario, not "own" & "any" not granted), we get an empty object!
  // and more...
```

Read more at [Detailed Usage Example](/additional-documentation/detailed-usage-&-examples.html).
