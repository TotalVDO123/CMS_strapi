import { groupBy, pick } from 'lodash/fp';

import { async, contentTypes, traverseEntity } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import type { DocumentMetadata } from '../../../shared/contracts/collection-types';
import { getValidatableFieldsPopulate } from './utils/populate';

export interface DocumentVersion {
  id: string;
  documentId: string;
  locale: string;
  updatedAt: string | null | Date;
  publishedAt: string | null | Date;
}

const AVAILABLE_STATUS_FIELDS = [
  'id',
  'locale',
  'updatedAt',
  'createdAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'status',
];
const AVAILABLE_LOCALES_FIELDS = [
  'id',
  'locale',
  'updatedAt',
  'createdAt',
  'status',
  'publishedAt',
  'documentId',
];

const CONTENT_MANAGER_STATUS = {
  PUBLISHED: 'published',
  DRAFT: 'draft',
  MODIFIED: 'modified',
};

/**
 * Controls the metadata properties to be returned
 *
 * If `availableLocales` is set to `true` (default), the returned metadata will include
 * the available locales of the document for its current status.
 *
 * If `availableStatus` is set to `true` (default), the returned metadata will include
 * the available status of the document for its current locale.
 */
export interface GetMetadataOptions {
  availableLocales?: boolean;
  availableStatus?: boolean;
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * Returns available locales of a document for the current status
   */
  async getAvailableLocales(
    uid: UID.ContentType,
    version: DocumentVersion,
    allVersions: DocumentVersion[],
    validatableFields: string[] = []
  ) {
    // Group all versions by locale
    const versionsByLocale = groupBy('locale', allVersions);

    // Delete the current locale
    delete versionsByLocale[version.locale];

    // For each locale, get the ones with the same status
    // There will not be a draft and a version counterpart if the content
    // type does not have draft and publish
    const model = strapi.getModel(uid);
    const keysToKeep = [...AVAILABLE_LOCALES_FIELDS, ...validatableFields];

    const traversalFunction = async (localeVersion: DocumentVersion) =>
      traverseEntity(
        ({ key }, { remove }) => {
          if (keysToKeep.includes(key)) {
            // Keep the value if it is a field to pick
            return;
          }

          // Otherwise remove this key from the data
          remove(key);
        },
        { schema: model, getModel: strapi.getModel.bind(strapi) },
        // @ts-expect-error fix types DocumentVersion incompatible with Data
        localeVersion
      );

    const mappingResult = await async.map(
      Object.values(versionsByLocale),
      async (localeVersions: DocumentVersion[]) => {
        const mappedLocaleVersions: DocumentVersion[] = await async.map(
          localeVersions,
          traversalFunction
        );

        if (!contentTypes.hasDraftAndPublish(model)) {
          return mappedLocaleVersions[0];
        }

        const draftVersion = mappedLocaleVersions.find((v) => v.publishedAt === null);
        const otherVersions = mappedLocaleVersions.filter((v) => v.id !== draftVersion?.id);

        if (!draftVersion) {
          return;
        }

        return {
          ...draftVersion,
          status: this.getStatus(draftVersion, otherVersions as any),
        };
      }
    );

    return (
      mappingResult
        // Filter just in case there is a document with no drafts
        .filter(Boolean) as unknown as DocumentMetadata['availableLocales']
    );
  },

  /**
   * Returns available status of a document for the current locale
   */
  getAvailableStatus(version: DocumentVersion, allVersions: DocumentVersion[]) {
    // Find the other status of the document
    const status =
      version.publishedAt !== null
        ? CONTENT_MANAGER_STATUS.DRAFT
        : CONTENT_MANAGER_STATUS.PUBLISHED;

    // Get version that match the current locale and not match the current status
    const availableStatus = allVersions.find((v) => {
      const matchLocale = v.locale === version.locale;
      const matchStatus = status === 'published' ? v.publishedAt !== null : v.publishedAt === null;
      return matchLocale && matchStatus;
    });

    if (!availableStatus) return availableStatus;

    // Pick status fields (at fields, status, by fields), use lodash fp
    return pick(AVAILABLE_STATUS_FIELDS, availableStatus);
  },
  /**
   * Get the available status of many documents, useful for batch operations
   * @param uid
   * @param documents
   * @returns
   */
  async getManyAvailableStatus(uid: UID.ContentType, documents: DocumentVersion[]) {
    if (!documents.length) return [];

    // The status and locale of all documents should be the same
    const status = documents[0].publishedAt !== null ? 'published' : 'draft';
    const locale = documents[0]?.locale;
    const otherStatus = status === 'published' ? 'draft' : 'published';

    return strapi.documents(uid).findMany({
      filters: {
        documentId: { $in: documents.map((d) => d.documentId).filter(Boolean) },
      },
      status: otherStatus,
      locale,
      fields: ['documentId', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
    }) as unknown as DocumentMetadata['availableStatus'];
  },

  getStatus(version: DocumentVersion, otherDocumentStatuses?: DocumentMetadata['availableStatus']) {
    const isDraft = version.publishedAt === null;
    const currentStatus = isDraft ? CONTENT_MANAGER_STATUS.DRAFT : CONTENT_MANAGER_STATUS.PUBLISHED;

    if (!otherDocumentStatuses?.length) {
      return currentStatus;
    }

    if (isDraft) {
      const hasPublished = otherDocumentStatuses.some((d) => d.publishedAt !== null);
      if (!hasPublished) {
        return CONTENT_MANAGER_STATUS.DRAFT;
      }
    }

    const primaryTime = new Date(version.updatedAt ?? 0).getTime();
    const otherTime = new Date(otherDocumentStatuses[0]?.updatedAt ?? 0).getTime();
    const isPrimaryNewer = primaryTime > otherTime;

    // If the difference between the primary and the other document is less than 500ms
    const isSameOrLessThanThreshold = Math.abs(primaryTime - otherTime) <= 500;

    if (isSameOrLessThanThreshold) {
      return CONTENT_MANAGER_STATUS.PUBLISHED;
    }

    return isPrimaryNewer && isDraft
      ? // A document is only modified if the draft and published entries are updated at different times
        // and the draft is newer than the published version
        CONTENT_MANAGER_STATUS.MODIFIED
      : currentStatus;
  },

  // TODO is it necessary to return metadata on every page of the CM
  // We could refactor this so the locales are only loaded when they're
  // needed. e.g. in the bulk locale action modal.
  async getMetadata(
    uid: UID.ContentType,
    version: DocumentVersion,
    { availableLocales = true, availableStatus = true }: GetMetadataOptions = {}
  ) {
    // TODO: Ignore publishedAt if availableStatus=false, and ignore locale if
    // i18n is disabled
    const populate = getValidatableFieldsPopulate(uid);
    const versions = await strapi.db.query(uid).findMany({
      where: { documentId: version.documentId },
      populate: {
        // Populate only fields that require validation for bulk locale actions
        ...populate,
        // NOTE: creator fields are selected in this way to avoid exposing sensitive data
        createdBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
        updatedBy: {
          select: ['id', 'firstname', 'lastname', 'email'],
        },
      },
    });

    const availableLocalesResult = availableLocales
      ? await this.getAvailableLocales(uid, version, versions, Object.keys(populate))
      : [];

    const availableStatusResult = availableStatus
      ? this.getAvailableStatus(version, versions)
      : null;

    return {
      availableLocales: availableLocalesResult,
      availableStatus: availableStatusResult ? [availableStatusResult] : [],
    };
  },

  /**
   * Returns associated metadata of a document:
   * - Available locales of the document for the current status
   * - Available status of the document for the current locale
   */
  async formatDocumentWithMetadata(
    uid: UID.ContentType,
    document: DocumentVersion,
    opts: GetMetadataOptions = {}
  ) {
    if (!document) {
      return document;
    }

    const hasDraftAndPublish = contentTypes.hasDraftAndPublish(strapi.getModel(uid));

    // Ignore available status if the content type does not have draft and publish
    if (!hasDraftAndPublish) {
      opts.availableStatus = false;
    }

    const meta = await this.getMetadata(uid, document, opts);

    return {
      data: {
        ...document,
        // Add status to the document only if draft and publish is enabled
        status: hasDraftAndPublish
          ? this.getStatus(document, meta.availableStatus as any)
          : undefined,
      },
      meta,
    };
  },
});
