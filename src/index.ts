import { PermissionDefinition } from './PermissionDefinitions';

export { Permissions, IPermissionsOptions } from './Permissions';
export {
  EPossession,
  GrantPermitQuery,
  IContext,
  IResourceItemWithId,
  IResourceItemWithOptionalId,
  IUser,
  isValidIUser,
  TActionsList,
  TAttributes,
  TGrants,
  Tid,
  TisOwner,
  TlimitOwned,
  TlimitOwnReduce,
  TlistOwned,
} from './types';
export { Permit } from './Permit.class';
export {
  PermissionDefinition,
  PermissionDefinitionDefaults,
  ICompletePermissionDefinitions,
} from './PermissionDefinitions';
export { setLogger, getLogger, IPermissionsLogger } from './logger';
