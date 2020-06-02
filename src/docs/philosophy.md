# Philosophy

The philosophy of SuperAwesome Permissions & `PermissionDefinitions`:

* as **simple** and as **powerful** as possible.

* as **clear**, declarative & reusable as possible.

* tight to **code** & **execution environment**, so it's extendable & powerful.

* **code based** (PDs & ownership hooks) so these can be committed, reviewed & versioned.

* **forgiving** of trivialities, but failing early for serious flaws.

# Principles

* Be **part of the Service** (Resource Server / API) in code & runtime, instead of some external, obscure & hard to maintain & keep at parity system. This helps have environment parity in terms of `PermissionDefinition` rules: they live in your app that gets deployed in multiple environments, instead of some XML configuration file that lives somewhere in your deployed environment and can deviate between environments.

* Be applicable to backends (or frontends) **without a DB** at all (eg other APIs, storage systems, or generic `can-user-do-action-on-resource` type questions etc). SA-Permissions is also separate from REST & URI semantics, so it can be used in non-REST and non-API world, such as Frontends, GraphQL servers nad other standalone apps, even games.

* Be **forgiving** of trivialities:

 - Users with **empty roles** are legitimate (eg `{ id: 123, roles: [] }`) . Rationale is it may represent a new User on our service, or a User from a different OAuth service or federation with filtered roles etc. There is no need to ban them, they will just not be able to do anything privileged. **Note: behavior deviates from [AccessControl](https://github.com/onury/accesscontrol) lib.**

 - Users with **unknown roles** are legitimate (eg `{ id: 123, roles: ['YOGA_INSTRUCTOR'] }`). Rationale is its just a role we aren't aware of, other services like YogaClass might be though, and why have a different user just for the yoga system? It causes us no trouble, the role is just ignored in this service, no need to fail. We only **warn about it** once per execution. **Note: behavior deviates from [AccessControl](https://github.com/onury/accesscontrol) lib.**

* **Fail early**, for serious reasons:

 - inconsistencies in `PermissionDefinition` throw on either [`addDefinitions()`](/classes/Permissions.html#addDefinitions) or [`build()`](/classes/Permissions.html#build) as early as possible. It fails if your PDs are inconsistent, for example you if

     - you are missing essential information, like `roles`, `resource` or any `grant` actions.

     - you have `own` possession declared but you dont have ownership hooks (ie you need both an [`isOwner`](/classes/PermissionDefinition_DOCS.html#isOwner) and one of [`listOwned`](/classes/PermissionDefinition_DOCS.html#listOwned) or a [`limitOwned`](/classes/PermissionDefinition_DOCS.html#limitOwned) (but not both).
     
     - you try to redefine the same `action` attributes for a given `role` + `resource` in a different PermissionDefinition. 

 - bad requests at runtime (i.e on [`permissions.grantPermit()`](/classes/Permissions.html#grantPermit)):

    - invalid `action` (i.e unknown) throws. Only actions that have been **seen at least once** at the [`permissions.addPersmissions()`](/classes/Permissions.html#addDefinitions) stage are valid.

      **Note:** actions are NOT tight to resources - see [Caveat 1. Leaky actions](/additional-documentation/faq,-gotchas-&-caveats.html)

    - invalid `resource` (i.e `UnknownThing`) throws on `permit.grantPermit()`, cause invalid resources means something is wrong/missing from your PermissionDefinitions. This is different than how [AccessControl](https://github.com/onury/accesscontrol) lib & [AccessControl-Re](https://github.com/anodynos/accesscontrol-re) treats those.
    
    - invalid `user`, i.e not complying to `{id: number | string, roles: string[]}`

**All of the above behaviors & the library itself are tested with hundreds of tests.** 
 
# Architecture & Prior Art

Consider the top level architecture of SuperAwesome Permissions below:

![architecture-top-level](/images/architecture-top-level.svg "SuperAwesome Permissions: top level architecture")

SuperAwesome Permissions is directly using [AccessControl-Re](https://github.com/anodynos/accesscontrol-re) which is a **facade** of [AccessControl lib](https://github.com/onury/accesscontrol) (both MIT licensed), solving various limitations & issues while drastically **restricting its fluent and verbose API**.

Although SuperAwesome Permissions is modelled & was initially inspired by [AccessControl lib](https://github.com/onury/accesscontrol), it now **exposes only its own public API**, completely isolated from it or AccessControl-Re, which means that a subsequent SA-Permissions version could **replace them with some other implementation**, without breaking compatibility with existing code (if that was needed for some reason).

Internally, SA-Permissions is using **only**:

  * `addAccessInfo()` from the restricted [AccessControl-Re](https://github.com/anodynos/accesscontrol-re) API.

  * `ac.permission({...})` plus some trivial introspective methods from the locked [AccessControl](https://github.com/onury/accesscontrol) instance (returned internally by AccessControl-Re's `build()`)

The focus of SA-Permissions is to build on top of those functionalities and to provide the missing link: *Possession* & *Ownership* control in the JavaScript world.

