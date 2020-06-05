# SuperAwesome Permissions

* NPM package: `@superawesome/permissions`

* Github: `https://github.com/SuperAwesomeLTD/permissions`

# Features

In lieu of a proper landing page, **SuperAwesome Permissions** features:
  
- [:left_luggage:](/#) **Controlled Access** to Resources

- [:nail_care:](/#) **Fine Grained** Resource Attributes picking

- [:customs:](/#) Dynamic **Ownership** Rules, hooked to your data layer

- [:performing_arts:](/#) Trivial conversion of **Business Rules for Access Control** to **executing permissions** (and vise versa).

- [:atom:](/#) Straight-forward fusion of [Role-Based Access Control](https://en.wikipedia.org/wiki/Role-based_access_control), [Attribute-Based Access Control](https://en.wikipedia.org/wiki/Attribute-based_access_control) and **Whatever-You-Make-it Access control**

- [:telescope:](/#) Unlimited **Scalability** (lazy & eager ownership evaluation)
  
- [:wrench:](/#) Easy **Integration** with everything (REST, Graphql, SQL, NoSQL, APIs, Frontend, Games, anything)

- [:shell:](/#) **Zero dependencies** with servers, services & other moving parts
  
- [:triangular_ruler:](/#) Orthogonal / **Aspect Oriented** philosophy

- [:ticket:](/#) **Permit** is all you need to allow a **user** do an **action** on a **resource**    

_(^^ github needed to show icons ^^)_
 
## Contents

The actual generated docs are at `npm run docs:serve` and **coming soon** at [**SuperAwesome Permissions Documentation**](https://permissions.docs.superawesome.com). Go to the left, at the CompoDocs Nav Bar.

**NOTE: THESE LINKS BREAK ON GITHUB! (^^^ read above ^^^)**

- [Introduction & Glossary](additional-documentation/introduction-&-glossary.html)

- [Basic Usage](additional-documentation/basic-usage.html)

- [Detailed Usage & Examples](additional-documentation/detailed-usage-&-examples.html)

- [Philosophy, Principles & Architecture](additional-documentation/philosophy,-principles-&-architecture.html)

- [Inspiration, Problem and Prior Art](/additional-documentation/inspiration,-problem,-prior-art.html).

- [FAQ, Gotchas & Caveats](additional-documentation/faq,-gotchas-&-caveats.html)

- [Future Roadmap](additional-documentation/future-roadmap.html)

**Note**: We also have [native Nestjs Guard & Decorators](https://github.com/SuperAwesomeLTD/permissions-nestjs) empowering an Orthogonal / Aspect Oriented Architecture.

# Versioning

The project follows [semantic versioning](https://semver.org/) which effectively means a new major version x.0.0 is released for breaking changes, minor 0.x.0 for new features and patch 0.0.x for fixes. 

# How to develop

## Code

- Simply do an `npm run test:watch` to develop and test at each change.

- With `npm run build:ts` you get a build of the library at `/dist`.

- With `npm run build` you get a full build of library & docs at `/dist`.

## Documentation

End user docs reside at `src/docs` & `*.md.spec` files:

- With `npm run docs:build` it builds docs at `dist/docs` once.

- With `npm run docs:serve` it serves docs at http://127.0.0.1:8090 in non-watch mode.

- With `npm run docs:watch` it serves docs at http://127.0.0.1:8090 in watch & serve mode.

## Docs generation

All `*.md.spec.ts` files generate equivalent `src/docs/generated/*.generated.md`

**Note**: On watch mode it's sometimes slow to build & serve, especially initially. Just change & save the `*.md.spec.ts` file to trigger generation & also refresh browser if its not refreshing automatically.
