import get from 'lodash/get';
import { useRBACProvider, findMatchingPermissions } from '@strapi/helper-plugin';

const NOT_ALLOWED_FILTERS = ['json', 'component', 'media', 'richtext', 'dynamiczone', 'password'];
const TIMESTAMPS = ['createdAt', 'updatedAt'];

const useAllowedAttributes = (contentType, slug) => {
  const { allPermissions } = useRBACProvider();

  const readPermissionsForSlug = findMatchingPermissions(allPermissions, [
    {
      action: 'plugin::content-manager.explorer.read',
      subject: slug,
    },
  ]);

  const canReadAdminUsers =
    findMatchingPermissions(allPermissions, [
      {
        action: 'admin::users.read',
        subject: null,
      },
    ]).length > 0;

  const readPermissionForAttr = get(readPermissionsForSlug, ['0', 'properties', 'fields'], []);
  const attributesArray = Object.keys(get(contentType, ['attributes']), {});
  const allowedAttributes = attributesArray.filter((attr) => {
    const current = get(contentType, ['attributes', attr], {});

    if (!current.type) {
      return false;
    }

    if (NOT_ALLOWED_FILTERS.includes(current.type)) {
      return false;
    }

    if (!readPermissionForAttr.includes(attr) && attr !== 'id' && !TIMESTAMPS.includes(attr)) {
      return false;
    }

    return true;
  });

  if (canReadAdminUsers) {
    // Author attributes are not listed on the contentType attributes, so we added them manually
    allowedAttributes.push('createdBy', 'updatedBy');
  }

  return allowedAttributes.sort();
};

export default useAllowedAttributes;
