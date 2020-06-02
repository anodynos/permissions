/** Copied from https://stackoverflow.com/a/13842010/799502 / https://github.com/PimpTrizkit/PJs/wiki/11.-Object-to-String-(pOTS.js)
 *  Should be replaced with util.inspect, as long as it is parsable by prettier
 * */

/* eslint-disable */
export const pOTS: any = (o) => {
  if (!o) return null;
  let str = '',
    na = 0,
    k,
    p;
  if (typeof o === 'function') return o.toString();

  if (typeof o == 'object') {
    if (!pOTS.check) pOTS.check = new Array();
    for (k = pOTS.check.length; na < k; na++) if (pOTS.check[na] == o) return '({})';
    pOTS.check.push(o);
  }
  (k = ''), (na = typeof o.length == 'undefined' ? 1 : 0);
  for (p in o) {
    if (na) k = "'" + p + "':";
    if (typeof o[p] == 'string') str += k + "'" + o[p] + "',";
    else if (typeof o[p] == 'object') str += k + pOTS(o[p]) + ',';
    else str += k + o[p] + ',';
  }
  if (typeof o == 'object') pOTS.check.pop();
  if (na) return '({' + str.slice(0, -1) + '})';
  else return '[' + str.slice(0, -1) + ']';
};
