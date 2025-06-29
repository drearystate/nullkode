import {
  createdAtFilter,
  updatedAtFilter,
} from '@common/datatable/filters/timestamp-filters';
import {
  BackendFilter,
  FilterControlType,
  FilterOperator,
} from '@common/datatable/filters/backend-filter';
import {message} from '@common/i18n/message';
import {USER_MODEL} from '@common/auth/user';

export const ProjectsDatatableFilters: BackendFilter[] = [
  {
    key: 'published',
    label: message('Published'),
    description: message('Whether project is published'),
    defaultOperator: FilterOperator.eq,
    control: {
      type: FilterControlType.Select,
      defaultValue: '01',
      options: [
        {
          key: '01',
          label: message('Published'),
          value: true,
        },
        {
          key: '02',
          label: message('Unpublished'),
          value: false,
        },
      ],
    },
  },
  {
    key: 'user_id',
    label: message('User'),
    description: message('User project was created by'),
    defaultOperator: FilterOperator.eq,
    control: {
      type: FilterControlType.SelectModel,
      model: USER_MODEL,
    },
  },
  createdAtFilter({
    description: message('Date project was created'),
  }),
  updatedAtFilter({
    description: message('Date project was last updated'),
  }),
];
