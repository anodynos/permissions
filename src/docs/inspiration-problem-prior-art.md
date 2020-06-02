# Inspiration

## History

SuperAwesome Permissions can be thought of as a fusion of:

* the widely adopted [RBAC (Role-Based Access Control)](https://en.wikipedia.org/wiki/Role-based_access_control) which tries to simulate the real world of Role Assignments to Users.

* [ABAC (Attribute-Based Access Control)](https://en.wikipedia.org/wiki/Attribute-based_access_control) which allows for detailed policies on resources, including which actions can be performed on which resource's attributes, by different roles.

* others such as *User Based Access control*, *Rule-based Access Control* and even *Time-based Access Control* can easily be programmed through the extensible ownership hooks.

## The Problem

> Why did we build another JS library?

There is no easy way to effectively define & use **ownership based** & **fine grained resource permissions** in the tools & JS libraries (and beyond JS also) that we evaluated.

For example in OAuth2 solutions like Keycloak, you can easily attach **Roles** to **Users** but defining permissions, policies, rules, resources etc to evaluate against roles at run time is a huge pain, especially for small teams that dont have the expertise and dont want to spend months reading huge manuals.

The way rules work in frameworks & systems like Keycloak (and all other OAuth2 backends) have these characteristics:

* weird [pattern matching definitions](https://docs.spring.io/spring-security/site/docs/current/reference/html/authorization.html#el-access-web-path-variables) in XML or that look like complicated RegExps or [irrelevant text files](https://www.baeldung.com/apache-shiro-access-control) at best.

* they are often managed [through some complicated UI](https://www.keycloak.org/docs/latest/authorization_services/#_resource_server_overview), instead of code.

* resources live [outside your app](https://www.keycloak.org/docs/latest/authorization_services/#_resource_view) in "resource servers" as per OAuth2. This means they have to be duplicated, redefined elsewhere and kept in sync.

* they are [tight to URL or REST semantics](https://docs.kantarainitiative.org/uma/wg/oauth-uma-grant-2.0-05.html). Need we say more?

* permissions & rules reside [outside your codebase](https://www.keycloak.org/docs/latest/authorization_services/#_permission_overview) and hence are not version controlled.

* they execute [outside your runtime and away from your source of Truth and the domain data (i.e your DB)](https://www.keycloak.org/docs/latest/authorization_services/#_policy_js) and therefore you need more integrations to use them.

* They are [hard to define](https://stackoverflow.com/questions/42186537/resources-scopes-permissions-and-policies-in-keycloak#), understand & maintain and they have [limitations in customizing](https://stackoverflow.com/questions/44826724/keycloak-set-group-as-owner-of-resource).

To our best knowledge at the time of development, there was no JS/TS library that implements permissions and resource ownerships to a good extend with examples, maybe due to [OAuth being complicated and impractical](https://softwareengineering.stackexchange.com/questions/372526/how-to-handle-per-resource-fine-grained-permissions-in-oauth).

**SuperAwesome Permissions** is drastically different, it came to "democratize" Permissions, Privacy & Security for your apps, the easy way! Check out [Basic Usage](http://127.0.0.1:8090/additional-documentation/basic-usage.html) or [Philosophy & Principles](/additional-documentation/philosophy-&-principles.html) to see how it differs & overcomes these limitations.


## Prior Art

* The initial inspiration was the [AccessControl](https://github.com/onury/accesscontrol) library, which is used internally/indirectly by SuperAwesome Permissions. Unfortunately it has [some nagging](https://github.com/onury/accesscontrol/issues/46) [limitations](https://github.com/onury/accesscontrol/issues/58) and [bugs](https://github.com/onury/accesscontrol/issues/67) but most importantly it is lacking the ownership handling it self.

* The [accesscontrol-re](https://github.com/anodynos/accesscontrol-re) library, a facade enhancing the [AccessControl](https://github.com/onury/accesscontrol) lib, adding various features and solving some limitations. Also used internally by SuperAwesome Permissions, in front of AccessControl.

* The [nest-access-control](https://github.com/nestjsx/nest-access-control) library, since we are interested in [NestJS](https://nestjs.com/) but again it [doesnt deal with ownership](https://github.com/nestjs-community/nest-access-control/issues/11). (BTW the sister project [@SuperAwesome/permissions-nestjs](http://permissions-nestjs.docs.superawesome.com/) builds on top of SuperAwesome Permissions giving you native NestJS guards & decorators you need for full ownership permissions).

- [Node ACL](https://github.com/OptimalBits/node_acl) is another popular permissions system, but it iss tight to REST only (what about GraphQL, frontend, custom APIs?), its quite verbose, it requires its own DB layers and it also [ha no cater for ownerships](https://github.com/OptimalBits/node_acl/issues/38) also.

- [Casl](https://stalniy.github.io/casl) is a popular library (~2K stars) with a similar scope, inspired by [CanCan Ruby gem](https://github.com/ryanb/cancan). Its also isomorphic (works in FrontEnd & Backend). It claims to be agnostic of DB layer, but it's highly influenced and integrated with MongoDB. It's API & permission definitions are not very clear & dont not lend them selves to non-technical people. Also it is not dealing with Ownerships/possessions inherently.

- In the JVM world [Authorization in Apache Shiro](https://shiro.apache.org/authorization.html) has similar aims with SuperAwesome Permissions, but the definitions of ownership are disjoint of permission definitions (docs warn that _"Permission statements reflect behavior (actions associated with resource types) only. They do not reflect who is able to perform such behavior."_) so it is up to the developer to associate permissions to the current user, which can be problematic. Shiro is also suggesting the usage of methods like `currentUser.hasRole(roleName)`, `hasRoles(roleNames)` or `hasAllRoles(roleNames)` but we find the usage of **role checking methods** to becoming brittle code and hidden logic. Consider the example code given `if (currentUser.hasRole("administrator")) { /*show the admin button */ } else {/* don't show the button / Grey it out */ }` and imagine these role checks in various places (show the button, load the tab, on the backend and frontend) etc. What happens if we wanted to introduce a "super_admin" role (that can do what the admin can do plus more)? We would have to change the code that is controlling the button visibility to add this role in the condition. Instead, SA Permissions promotes the authoring of simpler code based on the "can this user perform this action on this resource / resourceId", where the roles a user holds do not need to be checked within the apps main code. This means if the new role "super_admin" is introduced on a permission definition, allowing users with this role to access the "admin button" or the "admin screen", the code that controls the button ot the tab etc, do not need to be touched!


Common Repo Interface
ComRein