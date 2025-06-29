<?php

namespace App\Services\Admin;

use App\Models\Project;
use App\Models\User;
use Common\Admin\Analytics\Actions\GetAnalyticsHeaderDataAction;
use Common\Database\Metrics\ValueMetric;
use Common\Domains\CustomDomain;
use Common\Files\FileEntry;

class GetAnalyticsHeaderData implements GetAnalyticsHeaderDataAction
{
    public function execute(array $params = []): array
    {
        return [
            array_merge(
                [
                    'icon' => [
                        [
                            'tag' => 'path',
                            'attr' => [
                                'd' =>
                                    'M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
                            ],
                        ],
                    ],
                    'name' => __('New users'),
                ],
                (new ValueMetric(
                    User::query(),
                    dateRange: $params['dateRange'],
                ))->count(),
            ),
            array_merge(
                [
                    'icon' => [
                        [
                            'tag' => 'path',
                            'attr' => [
                                'd' =>
                                    'M19 5v2h-4V5h4M9 5v6H5V5h4m10 8v6h-4v-6h4M9 17v2H5v-2h4M21 3h-8v6h8V3zM11 3H3v10h8V3zm10 8h-8v10h8V11zm-10 4H3v6h8v-6z',
                            ],
                        ],
                    ],
                    'name' => __('New projects'),
                ],
                (new ValueMetric(
                    Project::query(),
                    dateRange: $params['dateRange'],
                ))->count(),
            ),
            array_merge(
                [
                    'icon' => [
                        [
                            'tag' => 'path',
                            'attr' => [
                                'd' =>
                                    'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z',
                            ],
                        ],
                    ],
                    'name' => __('New domains'),
                ],
                (new ValueMetric(
                    CustomDomain::query(),
                    dateRange: $params['dateRange'],
                ))->count(),
            ),
            array_merge(
                [
                    'icon' => [
                        [
                            'tag' => 'path',
                            'attr' => [
                                'd' =>
                                    'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z',
                            ],
                        ],
                    ],
                    'name' => __('New uploads'),
                ],
                (new ValueMetric(
                    FileEntry::query(),
                    dateRange: $params['dateRange'],
                ))->count(),
            ),
        ];
    }
}
