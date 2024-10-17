import * as React from 'react';

import { useTracking, useQueryParams } from '@strapi/admin/strapi-admin';
import { Button, Popover } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import { useIntl } from 'react-intl';

import FilterList, { FilterStructure } from '../../../components/FilterList';
import FilterPopover from '../../../components/FilterPopover';
import { displayedFilters } from '../../../utils';
import type { Query } from '../../../../../shared/contracts/files';

export const Filters = () => {
  const [open, setOpen] = React.useState<boolean>(false);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [{ query }, setQuery] = useQueryParams<Query>();
  const filters = query?.filters?.$and || [];

  const handleRemoveFilter = (nextFilters: FilterStructure[]) => {
    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  const handleSubmit = (filters) => {
    trackUsage('didFilterMediaLibraryElements', {
      location: 'content-manager',
      filter: Object.keys(filters[filters.length - 1])[0],
    });
    setQuery({ filters: { $and: filters }, page: 1 });
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button variant="tertiary" startIcon={<Filter />} size="S">
          {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </Button>
      </Popover.Trigger>
      <FilterPopover
        displayedFilters={displayedFilters}
        filters={filters}
        onToggle={setOpen}
        onSubmit={handleSubmit}
      />
      <FilterList
        appliedFilters={filters}
        filtersSchema={displayedFilters}
        onRemoveFilter={handleRemoveFilter}
      />
    </Popover.Root>
  );
};
