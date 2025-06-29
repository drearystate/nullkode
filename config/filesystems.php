<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application. Just store away!
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Here you may configure as many filesystem "disks" as you wish, and you
    | may even configure multiple disks of the same driver. Defaults have
    | been set up for each driver as an example of the required values.
    |
    | Supported Drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => public_path('storage'),
            'throw' => false,
        ],

        'uploads' => [
            'driver' => 'dynamic-uploads',
            'local_root' => env(
                'PRIVATE_UPLOADS_LOCAL_ROOT',
                storage_path('app/uploads'),
            ),
            'remote_root' => env('PRIVATE_UPLOADS_REMOTE_ROOT', 'uploads'),
            'throw' => false,
        ],

        'public' => [
            'driver' => 'dynamic-public',
            'url' => 'storage',
            'visibility' => 'public',
            'local_root' => env(
                'PUBLIC_UPLOADS_LOCAL_ROOT',
                public_path('storage'),
            ),
            'remote_root' => env('PUBLIC_UPLOADS_REMOTE_ROOT', 'storage'),
            'throw' => false,
        ],

        // ARCHITECT SPECIFIC

        'projects' => [
            'driver' => 'local',
            'root' => public_path('storage/projects'),
            'visibility' => 'public',
            'directory_visibility' => 'public',
        ],

        'builder' => [
            'driver' => 'local',
            'root' => public_path('builder'),
            'url' => 'builder',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
