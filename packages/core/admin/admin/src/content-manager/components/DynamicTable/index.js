import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  TableProvider,
  TableEmptyBody,
  TableActionBar,
  TableHead,
  TableHeaders,
  useStrapiApp,
} from '@strapi/helper-plugin';
import { Table } from '@strapi/design-system';
import { useSelector } from 'react-redux';

import getReviewWorkflowsColumn from 'ee_else_ce/content-manager/components/DynamicTable/CellContent/ReviewWorkflowsStage/getTableColumn';
import { INJECT_COLUMN_IN_TABLE } from '../../../exposedHooks';
import { selectDisplayedHeaders } from '../../pages/ListView/selectors';
import { getTrad } from '../../utils';
import TableRows from './TableRows';
import { PublicationState } from './CellContent/PublicationState/PublicationState';
import BulkActionsBar from './BulkActionsBar';

const DynamicTable = ({
  canCreate,
  canDelete,
  canPublish,
  contentTypeName,
  action,
  isBulkable,
  isLoading,
  onConfirmDelete,
  onConfirmDeleteAll,
  onConfirmPublishAll,
  onConfirmUnpublishAll,
  layout,
  rows,
}) => {
  const { runHookWaterfall } = useStrapiApp();
  const hasDraftAndPublish = layout.contentType.options?.draftAndPublish ?? false;
  const { formatMessage } = useIntl();
  const displayedHeaders = useSelector(selectDisplayedHeaders);

  const tableHeaders = useMemo(() => {
    const headers = runHookWaterfall(INJECT_COLUMN_IN_TABLE, {
      displayedHeaders,
      layout,
    });

    const formattedHeaders = headers.displayedHeaders.map((header) => {
      const { fieldSchema, metadatas, name } = header;

      return {
        ...header,
        metadatas: {
          ...metadatas,
          label: formatMessage({
            id: getTrad(`containers.ListPage.table-headers.${name}`),
            defaultMessage: metadatas.label,
          }),
        },
        name: fieldSchema.type === 'relation' ? `${name}.${metadatas.mainField.name}` : name,
      };
    });

    if (hasDraftAndPublish) {
      formattedHeaders.push({
        key: '__published_at_temp_key__',
        name: 'publishedAt',
        fieldSchema: {
          type: 'custom',
        },
        metadatas: {
          label: formatMessage({
            id: getTrad(`containers.ListPage.table-headers.publishedAt`),
            defaultMessage: 'publishedAt',
          }),
          searchable: false,
          sortable: true,
        },
        cellFormatter({ publishedAt }) {
          return <PublicationState isPublished={!!publishedAt} />;
        },
      });
    }

    // this should not exist. Ideally we would use registerHook() similar to what has been done
    // in the i18n plugin. In order to do that review-workflows should have been a plugin. In
    // a future iteration we need to find a better pattern.

    // In CE this will return null - in EE a column definition including the custom formatting component.
    const reviewWorkflowColumn = getReviewWorkflowsColumn(layout);

    if (reviewWorkflowColumn) {
      formattedHeaders.push(reviewWorkflowColumn);
    }

    return formattedHeaders;
  }, [runHookWaterfall, displayedHeaders, layout, hasDraftAndPublish, formatMessage]);

  const withEntityActions = (canDelete || canPublish) && isBulkable;
  const rowCount = rows.length + 1;
  // Add 1 for the visually hidden actions header, and 1 for select all checkbox if the table is bulkable
  const colCount = tableHeaders.length + 1 + (withEntityActions ? 1 : 0);

  return (
    <TableProvider rowCount={rowCount} colCount={colCount}>
      {isLoading || !rows.length ? (
        <Table rowCount={rowCount} colCount={colCount} shadow="">
          <TableEmptyBody
            colSpan={colCount}
            action={action}
            contentType={contentTypeName}
            isLoading={isLoading}
          />
        </Table>
      ) : (
        <>
          <TableActionBar>
            <BulkActionsBar
              showPublish={canPublish && hasDraftAndPublish}
              showDelete={canDelete}
              onConfirmDeleteAll={onConfirmDeleteAll}
              onConfirmPublishAll={onConfirmPublishAll}
              onConfirmUnpublishAll={onConfirmUnpublishAll}
            />
          </TableActionBar>
          <Table rowCount={rowCount} colCount={colCount}>
            <TableHead withBulkActions withEntityActions={withEntityActions} rows={rows}>
              <TableHeaders headers={tableHeaders} />
            </TableHead>
            <TableRows
              canCreate={canCreate}
              canDelete={canDelete}
              onConfirmDelete={onConfirmDelete}
              contentType={layout.contentType}
              withBulkActions
              withEntityActions={withEntityActions}
              rows={rows}
              headers={tableHeaders}
            />
          </Table>
        </>
      )}
    </TableProvider>
  );
};

DynamicTable.defaultProps = {
  action: undefined,
};

DynamicTable.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canDelete: PropTypes.bool.isRequired,
  canPublish: PropTypes.bool.isRequired,
  contentTypeName: PropTypes.string.isRequired,
  action: PropTypes.node,
  isBulkable: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layout: PropTypes.exact({
    components: PropTypes.object.isRequired,
    contentType: PropTypes.shape({
      attributes: PropTypes.object.isRequired,
      metadatas: PropTypes.object.isRequired,
      layouts: PropTypes.shape({
        list: PropTypes.array.isRequired,
      }).isRequired,
      options: PropTypes.object.isRequired,
      settings: PropTypes.object.isRequired,
    }).isRequired,
  }).isRequired,
  onConfirmDelete: PropTypes.func.isRequired,
  onConfirmDeleteAll: PropTypes.func.isRequired,
  onConfirmPublishAll: PropTypes.func.isRequired,
  onConfirmUnpublishAll: PropTypes.func.isRequired,
  rows: PropTypes.array.isRequired,
};

export default DynamicTable;
