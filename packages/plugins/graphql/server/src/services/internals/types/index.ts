import pagination from './pagination';
import buildResponseCollectionMeta from './response-collection-meta';
import publicationState from './publication-state';
import filters from './filters';
import error from './error';
import type { Context } from '../../types';

export default (context: Context) => () => {
  const { strapi } = context;

  const { KINDS } = strapi.plugin('graphql').service('constants');

  return {
    [KINDS.internal]: {
      error: error(context),
      pagination: pagination(context),
      responseCollectionMeta: buildResponseCollectionMeta(context),
    },

    [KINDS.enum]: {
      publicationState: publicationState(context),
    },

    [KINDS.filtersInput]: {
      ...filters(context),
    },
  };
};
