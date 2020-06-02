# FAQ

> **Question:** What does SuperAwesome & SA stands for in **@superawesome/permissions**? 

It means [**SuperAwesome**](http://superawesome.com), the company that developed and brought you this library <a href="http://superawesome.com"><img src="/images/superawesome.svg" width="150" height="150" alt="SuperAwesome Logo/></a>



SuperAwesome's mission is to "make the internet safer for kids". This project aims to make it safer for everyone else as well ;-) 

> **Question**: How does this library stack up to / is it compatible with [OAuth 2.0](https://oauth.net/2/), [Authorization Code Grant Types](https://developer.okta.com/blog/2018/04/10/oauth-authorization-code-grant-type), JWT tokens, Client Credentials, Authorization code grants, Resource servers,  redirect_urls, scopes, policies, .... you name it?

SuperAwesome Permissions sits at a completely different abstraction & execution level from OAuth 2 and its implementations, and you can certainly use it without or alongside OAuth2. 

We believe OAuth2 does a great job with **authentication of users** in different scenarios (i.e somehow ending up with an authenticated user object in my app) but it is bloated and broken as a programming paradigm when it comes to **fine grain resource permissions with ownerships** inside your application/service. 

Apart from the [overwhelming complexity of OAuth2](https://speakerdeck.com/aaronpk/securing-your-apis-with-oauth-2-dot-0?slide=3) and lack of practical examples, the main reason is that ownership rules can have **arbitrary complexity**, and their dynamic evaluation against resources and specific resourceIds needs to be as close as possible to **where your entities & schema lives** (i.e your API/database layer). 

Also the rules and the ownership evaluation itself needs to be written in your API's & DB's language, instead of some distant authorization server with mystical url pattern matching, verbose XML and immensely complicated setups, with resource servers, permission servers, environment disparities and hundreds of documentation pages you need to read before you can be productive and secure. 

Further more and most crucially, we need to express our **PermissionDefinitions** with an **as close-to-the-real-world business language as possible**. In this real world language, we don't really care about REST semantics and CRUD only actions and resource URIs and scopes, but we wish to express our selves simply, with actions like "follow a user", "approve a document", "like a comment", "visible to friends of friends", "withdraw from joint account" etc.
 
The **PermissionDefinitions** in SuperAwesome Permissions are extremely **business rules language friendly** and could be reviewed and even authored by domain experts that are non-developers (except the ownership hooks actual JS implementations, which for the business friendly definitions `canBePlaceHoldersOfCamelCaseMethodNames` like in the examples.   

These virtues matter even more if we are NOT dealing with a typical REST API like OAuth 2.0 assumes, but with a GraphQL server, or a frontend UI, a native mobile app, a Speech UI or even a Game etc. Think of the question (a.k.a grant permit) "Can this User Open the Confidential Comments Drawer? And which attributes of it can they see?" This question can be posed against a Web Frontend, a Speech UI, a Game or anything else.  

As a conclusion, real world rules & questions expressed simply as "can ${user} perform ${action} on ${resource} X" are much easier to implement and maintain with SuperAwesome Permissions rather than mystical definition languages and complicated OAuth 2.0 setups.

> **Question**: SuperAwesome Permissions is serverless, it executes inside your code and runtime. But can we use it in a centralized authorization/permissions server OR store PermissionDefinitions in a DB OR use it in a microservices architecture OR .... etc? 

Nothing prevents you from doing any or all of those and more. SuperAwesome Permissions is agnostic of where it runs and where PermissionDefinitions are stored and how they are assembled. You can embed its small core directly into your APP, or you can centralize it and use it as a service, shared among different apps. 

The main concern is how you then handle in each app the resource ownerships, filtering & picking methods if it executes remotely, i.e `permit.pick(document)`, `permit.filterPick(documents)`, and that is entirely up to you. One easy setup is to have SuperAwesome Permissions executing in every application, but the PermissionDefinitions served by a centralized service.

Also keep in mind some of the [12 Factors](https://12factor.net/) such as [Dev/Prod parity](https://12factor.net/dev-prod-parity) & [codebase](https://12factor.net/codebase) which PermissionDefinitions offer you when they are part of the code.    

We'd love to hear your ideas, so drop us a line!

> **Question**: Is there an ExpressJS middleware? 

At the time of writing we don't have a generic ExpressJs middleware to release, only a [NestJs](http://permissions-nestjs.docs.superawesome.com/) using Decorators, Guards etc. This really shows the way of the orthogonal, aspect oriented design of the library and serves as a reference.    

But you can write one very easily (and donate it to the public domain :)). It would work like this: 

- The permissions-expressjs middleware is initialized with some PermissionDefinitions at boot time.

- Some previous middleware makes sure there is a 

    ```js    
    req.permitGrant = {user: {id: 1, roles: ['Employee'], resource: 'document', action: 'approve'}}
    ```
  and optionally a `resourceId` which you derive from request query params, request body etc.
  
  __Note:__ How users come up with the user, the resource and action names is up to them and highly depends on their setup.
 
- At request time, permissions-expressjs picks up `req.permitGrantQuery` and performs a simple `permissions.grantPermit(req.permitGrantQuery)`. 
    
  - If user+action+resource is not granted at all, it returns Forbidden.
    
  - If granted, it places the permit returned by `permissions.grantPermit(req.permitGrant)` to `req.permit` for users to employ later with calls to it such as `permit.filterPick()` or `permit.limitOwn()` etc.
  
That's mostly what is needed for a permissions-expressjs integration.            

> **Question**: How can I create a GOD role, someone that can do anything? I might even use it internally for my service-to-service work.

Its trivial: 

```js
const godPermissionDefinition = {  
  roles: 'GOD',
  resource: '*',
  descr: `As GOD I can do any Action, on any Resource, on any attribute.`,
  grant: [ '*:any' ]
}

const user = {id:0, roles: ['GOD']};
```

Note: we can name 'GOD' however we like ;-)

Note: if you don't define any specific actions in your grant (as in the `'*:any'` above), then only the the CRUD `create`, `read`, `update` & `delete` are granted.   

**Also see further down if GOD is the owner of everything!** 

    Spoiler alert: He is not! 

> **Question**: I want to allow ONLY anonymous users to be able to do things (eg Login) that normal users cannot.

* Create a special role, eg `'ANONYMOUS'`, along with the PermissionsDefinitions that grant specific resources / actions like **login**. 

* Assign the `'ANONYMOUS'` role to the internal fake non-authenticated user, when no actual user exists. No one else will be able to **login** but `'ANONYMOUS'`. 

> **Question**: I want to open a security hole (!) in my system, an action on any resource that any known role can perform: 

```js
const securityHolePermissionDefinition = {
  roles: ['*'],
  resource: '*',
  descr: `Any known role can perform "securityHole" on any resource`,
  grant:['securityHole'],
}
```

# Ownership Hooks in a PermissionDefinition FAQ

> **Question**: In ownership hooks, I get compile or runtime errors when I try to define only `isOwner()` or only one of `listOwned()` & `limitOwned()`   

If you've specified `isOwner()` on a PermissionDefinition but not `listOwned()` or `limitOwned()` (or the other way around):

- In TS you'll get a compile time error ending with `Types of property 'isOwner' are incompatible. Type '() => Promise<true>' is not assignable to type 'never'.` and mentions of `RequireExactlyOne`, `PermissionDefinitionWithOwnershipInternal` & `PermissionDefinitionNoOwnershipInternal` before that.

- In plain JS you'll get a runtime error: `in addPermissions() PermissionDefinition has 'own' action but no "listOwned" nor "limitOwned" callbacks are there`. The good news is those errors will be at the `permissions.build()` stage which is at your app's bootstrap, instead of later at the more "dangerous" runtime `grantPermit()`, so you're informed asap.

> **Question**: why do we need both anyway?  

The reason we need both:  

- `isOwner()` is needed to when you run `permit.isOwn(123)` to answer the question "is current user the owner of this specific resourceId == 123"? In a typical REST server setup this would be used when you access one particular resource by id (eg `GET /documents/123`). 

- `listOwned()` or `limitOwned()` to effectively return you or filter the **list of own resourceIds** this user actually owns. It would be used in scenarios like `GET /documents` etc.  

If we relax this & let the user decide which one to implement, we'll have quite a few cases arising (some are ugly, some are complicated, starting from latter):

> **Question**: Why can't we simply define only `isOwner()` that's straight forward implement, to cater for simpler use cases?

Let's name this **Case A**, having `isOwner()` but `listOwned()/limitOwned()` not defined: 

When user requests a list of own resources (i.e `GET /documents`), we could: 

- use `permit.isOwn()` to filter allowed resourceIds (which is using your `isOwner()` hooks) in the JS world. In other words, it would have to retrieve all resourceIds from the DB without any restrictions and then programmatically filter out all those that don't pass the `permit.isOwn()` criteria. Very inefficient and **Most importantly, apart from scaling, we lose any kind of pagination ability using DB limit, skip etc.

- NOT use SuperAwesome Permissions for filtering things, but somehow hard code it. This would be a disaster: Permissions is not opinionated about which stack it's used in (backend/frontend/mobile/API/standalone/game etc) or which tech you have in place for data or comms (REST, GraphQL, SQL, Mongo, other API-as-DB etc), but it is opinionated about the principles of managing permissions with ownerships, wherever you use it: to leverage its power, you need to abstract away anything permissions related and rely on its methods to do the work.  

  The reason is maintainability & consistency:
     
  Consider Lines 14-16 of the "Simplest Protected Example" in the [permissions-nestjs docs](https://permissions-nestjs.docs.superawesome.com/additional-documentation/how-to-use-simple-example.html): there is nothing mentioned about the roles and their rules of which documents can be listed etc. Yet documents listed here are filtered properly and users get only the documents they should get for this action. If the roles or their rules change, this code is completely isolated from those changes. It would be exactly the same case with a different data layer such as ORM, SQL, Mongo etc. To protect from code changes when permissions logic changes, decouple it by relying on the permissions library to do the filtering and never filter with role based rules manually.
  
  The inconsistent and unmaintainable alternative would be to have code like this `if user.roles.include('someRole') ...` creeping up here and there to add or remove filters.   

> **Question**: Why can't we simply define only `listOwner()/limitOwner()` and skip `isOwner()` completely?

Let's name this **Case B**: in short, it would be great to have, but it can't be done: 

We have two possibilities when a scenario like `GET /documents/123` arises:

- B1: if `listOwner()` is defined, we can call it to get ALL own resourceIds and check if the one under check is among those. 

  This would work fine, but would not necessarily scale (if the user owns a huge number of ids). Whereas `isOwner()` can scale indefinitely (cause it is hitting the DB indexes just for the particular user + resourceId pair).

- B2: if `limitOwner()` is defined, we need a way to execute against the data, as `limitOwner()` configures a filter, but is not executing it. This would be nice to have, but you'd still need to define something extra (the data layer access, which isn't there yet cause it needs good thinking how to structure it, so it's left for R2/R3). So B2 doesn't work for now!
  
Case C: We don't do any of those, we just throw if the corresponding methods are missing at `grantPermit()` execution time. This would suck, cause we'll be offering a crippled runtime version of the functionality, but will be telling users "that's ok" to do manually - see below. 

> **Question**: are we going to deprecate `isOwner()` in favour of using `limitOwned()` in order to achieve the same thing then?

It's just a thought, but it's much harder than it sounds, hence its R2/R3. Reason is that `limitOwned()` is agnostic of what context it executes against, cause its just a gerneric way of filtering, depending on the context's nature. The `context` might be an array (then `limitOwned` is eseentially a function to pass to `Array.filter()`), but it can also be an SQL where clause (hence it an SQL statement added in some kind of ORM or an SQL string etc) or another API accessed by some url (then `limitOwned` is adding some query params to that url) etc.

What we're lacking currently in the definitions of R1, is a method to execute against the data so we can then check the resourceId passed at `permit.isOwn()` against the data by utilizing `limitOwned()`.


> **Question**: How do I structure my app? Do I need to carry a Permit instance around layers of my app and rely on it? Any caveats?  
 
That's exactly the idea! You carry a relevant permit with you (or create one when it makes sense) and that permit determines the "resource visibility based on your user's permissions". You then use it every time to restrict what the user gets back, both in terms of records & also attributes (i.e fine-grained permissions).
 
In a standard controller-service-DBrepo server architecture, to leverages Permissions, you'll create a Permit instance at the controller level and then pass it down to the service level to restrict records as they are about to be queried from the DB layer. 

For service-allow-all scenarios, at the service level you have two choices: we can either check for the existence of permit and just ignore adding clauses if its missing OR you can have an INTERNAL_SERVICE user with GOD-like privileges.

**Caveat**: If you ever catch your self checking for user's roles or grants or anything that doesn't involve Permit methods, you're probably doing it wrong. Let's discuss :-)


> **Question** What if we have endpoints with complicated logic with multiple complex conditions? How do we incorporate those with permissions.

The `permit.limitOwn()` method (or `permit.listOwn()` depending on your chosen usage) captures the complexity of user permissions in one place and should be **applied on top of any other restrictions** of your schema (eg your parent-child relations, other foreign keys, enabled or disabled flags, pagination limits etc). Think of it as an `AND WHERE restrictResourcesBasedOnPermissionsAllowedForUser` clause added to each of your queries orthogonally, restricting all of your resource queries. So all other non-standard restrictions can certainly take place where you need them irrespectively. 

The rule of thumb of the fine line of what part of the business logic is considered **a permission based on roles** OR based on the **core logic** of an app is simple:

- If the logic is always the same, irrespective of user roles (eg "filter only enabled documents" i.e WHERE enabled = true) then this doesn't belong to the permissions layer.

- If the behaviour of the query restriction depends on roles, then we should model it as a permission. For example "only admins and moderators can see non-approved documents". 

  Adding these restriction in permissions frees us from having this role-dependent logic hidden somewhere deep in our code. Instead, we have a clear roles-actions-ownership declaration, that gets dynamically evaluated and added to our query clauses always. This isolates the logic from roles-and-rules changes, and they then can scale indefinitely without affecting existing code.

# Caveats & Gotchas

## 1. Leaky Actions on Resources.

**All actions can be performed on all resources**

An action declared on any resource, is valid on any other resources (although denied). So if you declare `follow` on a **person** resource, SuperAwesome Permissions will not throw an error if you `follow` a **comment** resource, which might not make any sense in your app.

SuperAwesome Permissions **will not grant it** of course, but the semantics & sanity of your app would be improved if an error was thrown like "You can't perform action `follow` on resource **comment**" at runtime. To solve this, we need **AccessControl-Re** support or other workaround.

## 2. Over-optimistic attributes merging for own resources on multiple roles

In short: Multiple roles merged attributes on own actions & resources, don't consider the actual ownership of the resource.

For users with multiple roles, the attributes granted on actions for a specific `resourceId` owned by some role's ownership hooks, result to overoptimistic merged attributes defined by each Role & PermissionDefinitions where that action was granted, irrespective of the role(s) where the ownership hook was used from to evaluate the actual `resourceId` ownership.  

This is due to how the [AccessControl](https://github.com/onury/accesscontrol) library works and not a leaky abstraction. It can and will be fixed internally in subsequent version of SuperAwesome Permissions. 

See [Example 4 - Attributes merging](/additional-documentation/detailed-usage-&-examples.html) for how the glitch is manifested so you can be fully aware.

## 3. Ownership not defined means nothing is owned.

Consider the GOD example above in FAQ.

If we were to `grantPermit()` of a random `resourceId`: 

```js
const permit = await permissions.grantPermit({
  user: { id: 1, roles: ['GOD'] },
  resource: 'document',
  action: 'list',
  resourceId: 9999
});
```
      
we will get a permit with 

```       
   permit.granted === true
   permit.anyGranted === true
   permit.ownGranted === true  
```
       
but  

```js
(await permit.isOwn(999)) === false
```

So, **why isn't GOD the owner of everything**?

The short answer is that if ownership is not explicitly defined (via `action:own` and mandatory ownership hooks), it doesn't know if a resource belongs to this user. Note that the semantics currently are that `ownGranted` is always true, if `anyGranted` is true, [see this comment for more clarity](https://github.com/onury/accesscontrol/issues/14#issuecomment-328316670). 

Translated to the real world, just because you can access **any** (eg public service), it doesn't mean you **own** them. 

If you really want GOD or someone to own everything, you need to specify ownership hooks that always return true, i.e:

```      
  { ...
    grant:['*', '*:own'],    
    isOwner: () => true,                
    ...
  }
```
      
but you shouldn't really need to. Just respect `anyGranted` in your app to allow access to all items and use `anyAttributes`, and your GOD will be limitless. By the way respecting `anyGranted` and defaulting to `anyAttributes` is what happens internally in Permit helpers methods such as `permit.pick()`, `permit.filterPick()` etc.

Alternatively, we could make the GOD user also an EMPLOYEE, to inherit the EMPLOYEE's restricted definition of onwership.

```js
const permit = await permissions.grantPermit({
  user: { id: 1, roles: ['GOD', 'EMPLOYEE'] },
  resource: 'document',
  action: 'list',
  resourceId: 10
});

(await permit.isOwn(100)) === true
```