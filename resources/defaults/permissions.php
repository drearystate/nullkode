<?php

return [
    'roles' => [
        [
            'extends' => 'users',
            'name' => 'users',
            'default' => true,
            'permissions' => [
                [
                    'name' => 'projects.create',
                    'restrictions' => [['name' => 'count', 'value' => 8]],
                ],
                [
                    'name' => 'workspaces.create',
                    'restrictions' => [
                        [
                            'name' => 'count',
                            'value' => 3,
                        ],
                        [
                            'name' => 'member_count',
                            'value' => 5,
                        ],
                    ],
                ],
                [
                    'name' => 'ai.images',
                    'restrictions' => [['name' => 'tokens', 'value' => 100]],
                ],
                [
                    'name' => 'ai.text',
                    'restrictions' => [['name' => 'tokens', 'value' => 10000]],
                ],
                'editors.enable',
                'plans.view',
                'templates.view',
                'custom_domains.create',
            ],
        ],
        [
            'extends' => 'guests',
            'name' => 'guests',
            'guests' => true,
            'permissions' => [
                //
            ],
        ],
    ],
    'all' => [
        'builder' => [
            [
                'name' => 'projects.publish',
                'description' =>
                    'Allow user to publish their projects and make them public.',
            ],
            [
                'name' => 'editors.enable',
                'description' =>
                    'Allow user to enter custom css and js in site editor.',
            ],
            [
                'name' => 'projects.export',
                'description' =>
                    'Allow user to export their site to their own FTP server.',
            ],
            [
                'name' => 'projects.download',
                'description' =>
                    'Allow user to download their sites as a .zip file.',
            ],
        ],

        'projects' => [
            ['name' => 'projects.view', 'advanced' => true],
            [
                'name' => 'projects.create',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'projects',
                        ]),
                    ],
                ],
            ],
            ['name' => 'projects.update', 'advanced' => true],
            ['name' => 'projects.delete', 'advanced' => true],
        ],

        'workspaces' => [
            [
                'name' => 'workspaces.create',
                'restrictions' => [
                    [
                        'name' => 'count',
                        'type' => 'number',
                        'description' => __('policies.count_description', [
                            'resources' => 'workspaces',
                        ]),
                    ],
                    [
                        'name' => 'member_count',
                        'type' => 'number',
                        'description' =>
                            'Maximum number of members workspace is allowed to have.',
                    ],
                ],
            ],
            [
                'name' => 'workspaces.view',
                'description' =>
                    'Allow viewing of all workspaces on the site, regardless of who created them. User can view their own workspaces without this permission.',
                'advanced' => true,
            ],
            [
                'name' => 'workspaces.update',
                'description' =>
                    'Allow editing of all workspaces on the site, regardless of who created them. User can edit their own workspaces without this permission.',
                'advanced' => true,
            ],
            [
                'name' => 'workspaces.delete',
                'description' =>
                    'Allow deleting of all workspaces on the site, regardless of who created them. User can delete their own workspaces without this permission.',
                'advanced' => true,
            ],
        ],
        'workspace_members' => [
            [
                'name' => 'workspace_members.invite',
                'display_name' => 'Invite Members',
                'type' => 'workspace',
                'description' =>
                    'Allow user to invite new members into a workspace.',
            ],
            [
                'name' => 'workspace_members.update',
                'display_name' => 'Update Members',
                'type' => 'workspace',
                'description' => 'Allow user to change role of other members.',
            ],
            [
                'name' => 'workspace_members.delete',
                'display_name' => 'Delete Members',
                'type' => 'workspace',
                'description' => 'Allow user to remove members from workspace.',
            ],
        ],

        'templates' => [
            ['name' => 'templates.view', 'advanced' => true],
            ['name' => 'templates.create', 'advanced' => true],
            ['name' => 'templates.update', 'advanced' => true],
            ['name' => 'templates.delete', 'advanced' => true],
        ],

        'ai' => [
            [
                'name' => 'ai.images',
                'description' => 'Allow user to generate images using AI.',
                'restrictions' => [
                    [
                        'name' => 'tokens',
                        'type' => 'number',
                        'description' => __(
                            'Maximum number of tokens allowed per month for AI image generation. One token equals one generated image.',
                        ),
                    ],
                ],
            ],
            [
                'name' => 'ai.text',
                'description' =>
                    'Allow user to generate and modify text using AI.',
                'restrictions' => [
                    [
                        'name' => 'tokens',
                        'type' => 'number',
                        'description' => __(
                            'Maximum number of tokens allowed per month for AI text generation.',
                        ),
                    ],
                ],
            ],
        ],
    ],
];
