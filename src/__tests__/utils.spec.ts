import * as _ from 'lodash';
import { EPossession } from '../types';
import {
  deleteEmptyArrayKeys,
  isArraySetEqual,
  isLike,
  projectPDWithDefaultsToInternal,
} from '../utils';
import { PermissionDefinitionInternal } from '../PermissionDefinitions';
import { setLogger } from '../logger';

describe('utils tests', () => {
  describe('projectPDWithDefaultsToInternal', () => {
    it(`projects without defaults`, () => {
      const isOwner: any = () => {};
      const listOwned: any = () => {};

      expect(
        projectPDWithDefaultsToInternal(null, {
          roles: 'EMPLOYEE',
          resource: 'document',
          descr: `descr`,
          isOwner,
          listOwned,
          possession: EPossession.any,
          attributes: ['*', '!price', '!confidential'],
          grant: ['create', 'read', 'update:own', 'delete:own'],
        })
      ).toEqual({
        roles: ['EMPLOYEE'],
        resource: 'document',
        descr: `descr`,
        isOwner,
        listOwned,
        grant: {
          // these inherit their possession 'any' from PD.possession
          'create:any': ['*', '!price', '!confidential'],
          'read:any': ['*', '!price', '!confidential'],
          // these retain their possession 'own'
          'update:own': ['*', '!price', '!confidential'],
          'delete:own': ['*', '!price', '!confidential'],
        },
      } as PermissionDefinitionInternal);
    });

    it(`projects with defaults`, () => {
      const isOwner: any = () => {};
      const listOwned: any = () => {};

      expect(
        projectPDWithDefaultsToInternal(
          {
            roles: 'ADMIN',
            possession: EPossession.any,
            resource: 'document',
          },
          {
            descr: `descr`,
            isOwner,
            attributes: ['*', '!price', '!confidential'],
            grant: ['create', 'read', 'update:own', 'delete:own'],
          }
        )
      ).toEqual({
        roles: ['ADMIN'],
        resource: 'document',
        descr: `descr`,
        isOwner,
        grant: {
          // these inherit their possession 'any' from PD.possession
          'create:any': ['*', '!price', '!confidential'],
          'read:any': ['*', '!price', '!confidential'],
          // these retain their possession 'own'
          'update:own': ['*', '!price', '!confidential'],
          'delete:own': ['*', '!price', '!confidential'],
        },
      } as PermissionDefinitionInternal);
    });
  });

  describe('isArraySetEqual', () => {
    const refComparator = (a, b) => a === b;

    _.each(
      [
        [[1, 2, 3], [3, 2, 1], true],
        [[1, 2, 3, 4], [3, 2, 1], false],
        [[1, 2, 3], [4, 3, 2, 1], false],
      ],
      ([a, b, expected]: [any[], any[], boolean]) =>
        it('should Compare Arrays By Reference With Default Comparator', () =>
          expect(isArraySetEqual(a, b)).toEqual(expected))
    );

    _.each(
      [
        [[1, 2, 3], [3, 2, 1], true],
        [[1, 2, 3, 4], [3, 2, 1], false],
        [[1, 2, 3], [4, 3, 2, 1], false],
      ],
      ([a, b, expected]: [any[], any[], boolean]) =>
        it('should Compare Arrays By Reference With Custom Comparator', () =>
          expect(isArraySetEqual(a, b, refComparator)).toEqual(expected))
    );

    _.each(
      [
        [[{ a: 1 }, { b: 2 }, { c: 3 }], [{ c: 3 }, { b: 2 }, { a: 1 }], false],
        [
          [{ a: 1 }, { b: 2 }, { c: 3 }],
          [{ d: 4 }, { c: 3 }, { b: 2 }, { a: 1 }],
          false,
          _.isEqual,
        ],
        [
          [{ a: 1 }, { b: 'bbb' }, { c: { d: 4 } }],
          [{ c: { d: 4 } }, { b: 'bbb' }, { a: 1 }],
          true,
          _.isEqual,
        ],
      ],
      ([a, b, expected, comparator]: [any[], any[], boolean, any]) =>
        it('should Compare Arrays By Value With Custom Comparator', () =>
          expect(isArraySetEqual(a, b, comparator)).toEqual(expected))
    );
  });

  describe('isLike', () => {
    it.each([
      [{}, {}],
      [1, 1],
      ['aa', 'aa'],
      [{ a: 1 }, { a: 1, b: 'doesnt matter' }],
      [{ a: { a2: 2 } }, { a: { a2: 2, b2: 'doesnt matter' }, b: 'doesnt matter' }],
      [null, null],
      [undefined, undefined],
      [
        [1, 2, 3],
        [1, 2, 3],
      ],
    ])('returns true for values that o1 is like o2, %s %s', (o1, o2) =>
      expect(isLike(o1, o2)).toBe(true)
    );

    it.each([
      [{ a: 1 }, { a: 11, b: 2 }],
      [{ a: { a2: 2, b2: 333 } }, { a: { a2: 2, b2: 'does matter' }, b: 'doesnt matter' }],
      [1, 2],
      ['aa', 'bb'],
      [null, undefined],
      [
        [1, 2, 3],
        [1, 2, 3, 4],
      ],
    ])('returns false for values that o1 is not like o2, %s %s', (o1: any, o2: any) =>
      expect(isLike(o1, o2)).toBe(false)
    );
  });

  describe('deleteEmptyArrayKeys', () => {
    it.each([
      [{}, {}],
      [
        { a: 'val', emptyArray: [], b: { some: 'value', emptyArrayNested: [] } },
        { a: 'val', b: { some: 'value' } },
      ],
      [1, 1],
      [[], []],
      [
        [1, 2, 3],
        [1, 2, 3],
      ],
    ])('deletes all keys with an empty array as value %s', (o: any, expected) => {
      const actual = deleteEmptyArrayKeys(o);
      expect(actual).toBe(o);
      expect(actual).toEqual(expected);
    });
  });
});
