# Introduction

**SuperAwesome Permissions** is a JavaScript (written in TypeScript) library for:

 * **Permissions of Controlled Access to Resources**

 * with **Fine Grained and Object Attribute Level Access Restrictions**

 * and **Dynamic Ownership / Possession rules**

It solves the problem of **Permissions** & **Authorization** (Authorization as in Permissions, Access Control, Privileges) in an organized way, within your main code & execution environment, so you dont have to pollute your code with permissions logic.

It is meant to be used by Apps such as API backends but also frontends and other apps. It is agnostic of backend or frontend frameworks, notation patterns, URIs or REST semantics, OAuth Services etc and hence can be used everywhere JS runs.

## Auth is divided

To most people Auth means one thing. But there are two entirely different words and concepts hidden in this acronym: 

**Authentication**, from the Greek word **αυθεντικος / authentikos** which means "genuine" or "original", is simply proving who you claim to be. In broad terms, you exchange a username & password, or a fingerprint etc for an authenticated user (eg an object, a record, a token etc in the system). In the real world you show your ID/passport to the airport passport control, you're allowed in the country. What you can do in the country, in the Bank etc, its NOT up to **authentication**.     
  
**Authorization**, from the Anglo-French word **authorize**, which basically means permission (a.k.a Access Control or Client Privileges). This defines what you allowed to do, in each service or facility you use. This is probably the hardest unsolved problem to solve: many major data breaches were due to users having excessive permissions (and NOT authentication).    

![authentication-vs-authorization](/images/authentication-vs-authorization.png "Authentication VS Authorization")

Read more:

* [Authentication VS Authorization](https://www.okta.com/identity-101/authentication-vs-authorization/).

* [AUTHN & AUTHZ](http://technoponder.com/authentication-authorization/)

* [Distinguishing Authn and Authz](https://dzone.com/articles/distinguishing-authn-and-authz)

### Authorization is broken

Its easy to get confused with the duality of **Auth**, because OAuth 2.0 claims it solves both aspects and uses both words in its vocabulary, quite  often in a very misleading way.   

SuperAwesome Permissions **does not** attempt to solve **Authentication** at all. That's already solved brilliantly by OAuth 2.0: all the complicated signing & crypto algorithms, the comprehensive [workflows](https://auth0.com/docs/api-auth/which-oauth-flow-to-use), the server implementations(free & paid), SaaS platforms, client libraries for backend and frontend etc are all well-established.    

SuperAwesome Permissions solves ONLY **Authorization**, since this is what's broken in OAuth 2.0 (i.e it makes it immensely complicated for devs to implement) and what is mostly missing in 2020 (except the Corona Virus vaccine :). 

## Overview

**SuperAwesome Permissions** allows you to easily define & use permission rules on your service, that include dynamic ownership rules. For example:

> As an **EMPLOYEE**, I can **create**, **read**, **update**, **list** only my OWN **Documents** (created by me), all document attributes except **confidential**.

> As a **EMPLOYEE_MANAGER**, I can **read**, **list** and **review** all **Documents** that are created by **any User** that I'm **managing**, with all document attributes.

These are just the human business rules, but the actual JS definitions are quite easy to derive: you just express the above as a JSON/JS [`PermissionDefinition`](/classes/PermissionDefinition_DOCS.html) object!

Since **Ownership** is involved (e.g. `"all Documents of my company's Users"`) you need to provide the ownership rules (as callbacks, using JS code). Usually these rules evaluate dynamically & and optimistically (i.e if one User's **Role** has it, the **User** has it) , depending on the User and the state of your data layer. This way SA-Permissions can evaluate what __"my own documents"__ means for each **Role** (and therefore, **User**).

Read more about usage in [Basic Usage](/additional-documentation/basic-usage.html) or the [Philosophy, Principles & Architecture](/additional-documentation/philosophy,-principles-&-architecture.html) and [Inspiration, Problem and Prior Art](/additional-documentation/inspiration,-problem,-prior-art.html).

# Glossary

Before we move on, a small glossary:

* A **User** represents any user in our system, having at least a unique `id` and a list of associated Roles (eg `{id: 123, roles: ['ADMIN', 'CLERK']}` is a valid [`IUser`](/interfaces/IUser.html)). Note that `id` can also be a string, UUID etc.

* A **Role** is a just a simple string tag (eg `'ADMIN'` or `'CLERK'`). On its own, a **Role** is just a tag and conveys no meaning at all. It gets its meaning by defining **permissions** against **Resources** for any **User** with that **Role**. A **User** can have zero or more associated *Roles*.

* A **Resource**, another string tag, represents something the **User** needs to act upon. Usually it's an Entity (i.e a **Model**, a **Table** etc) of our System (eg. `Document`, `Comment`) but can also be anything else such a REST/GraphQL endpoint, a URL, an S3 file, a Device, something abstract like a `Drawer` or `VirtualPet` etc. At any interaction with the service, we can think of it as a **User** that wants to perform an **Action** against a particular **Resource**.

* An **Action**, another string tag, is a discrete operation a **User** wants to perform against a **Resource**. Standard actions are [CRUD operations (`create`, `read`, `update`, `delete`) from AccessControl](https://onury.io/accesscontrol/?content=guide#actions-and-action-attributes) lib, but SA-Permissions is flexible to support any arbitrary user-defined action for example `follow`, `list`, `approve`, `like`, `feed`, `share` etc.

* A [**PermissionDefinition**](/classes/PermissionDefinition_DOCS.html) (in short *PD*) blends all the above together: it defines what **Actions** the **Roles** (or better **Users** with these **Roles**) can perform on a **Resource**.

  Its an affirmative declaration, i.e an explicit **grant**. Anything that hasn't been explicitly allowed is denied. A **Role** and **Resource** can have one or more **PermissionDefinitions** associated with them, and they all come into effect equally (order does NOT matter).

 A [**PermissionDefinition**](/classes/PermissionDefinition_DOCS.html) can be expressed in plain English, for example:

 > As a SECRETARY I can **read** the **Calendar** of anyone, but only 'title' & 'date' attributes.
   But for people in **my team**, I can **read** & **update** all **Calendar** attributes except 'confidential'.

 where:

  * `SECRETARY` is a **Role**,

  * `Calendar` is a **Resource**

  * `read` and `update` are **Actions**

  * `people in my team` is the **ownership restriction**

  * `title` & `date` & `all attributes except 'confidential'` are the allowed attributes for each action & ownership.

  This english description, can be trivially turned into a JavaScript [`PermissionDefinition`](/classes/PermissionDefinition_DOCS.html) object to give us the fine grain **ownership control** within our app's domain. 
  
  For example the resulting [`PermissionDefinition`](/classes/PermissionDefinition_DOCS.html) from above would look like:

    ```js
      {
        roles: ['SECRETARY'],
        resource: 'Calendar',
        isOwner: isCalendarIdInMyTeam,
        listOwned: calendarIdsThatBelongToMyTeam,
        grant: {
          'read:any': ['title', 'date'],
          'read:own': ['*', '!confidential'],
          'update:own': ['*', '!confidential'],
        }
      }
    ```

  As you can see, **actions** can have **attributes** associated with them, to restrict the number of **allowed resource attributes** to be used for a particular granted **role + action + resource** combination, as well as ownership (i.e you can access different attributes on your "own" Calendar than those on "any"). 
  
  Also note that `isCalendarIdInMyTeam` & `calendarIdsThatBelongToMyTeam` are the ownership hooks (simple JavaScript async functions) that you need to implement (only when ownership is involved), in order to resolve if a particular resource item belongs to a user.
  
 Read more at the [Basic](/additional-documentation/basic-usage.html) or the [Detailed Usage & Examples](/additional-documentation/detailed-usage-&-examples.html).
