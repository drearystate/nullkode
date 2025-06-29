<?php

return [
    // logos
    [
        'name' => 'branding.logo_dark',
        'value' => 'images/logo-dark.png',
    ],
    [
        'name' => 'branding.logo_light',
        'value' => 'images/logo-light.png',
    ],
    //menus
    [
        'name' => 'menus',
        'value' => json_encode([
            [
                'positions' => ['dashboard'],
                'name' => 'Dashboard',
                'id' => '5vpqoq',
                'items' => [
                    [
                        'type' => 'route',
                        'permissions' => ['admin'],
                        'position' => 0,
                        'label' => 'Admin Area',
                        'action' => '/admin',
                        'id' => 311,
                    ],
                    [
                        'type' => 'route',
                        'position' => 1,
                        'label' => 'Projects',
                        'action' => '/dashboard',
                        'id' => 234,
                    ],
                    [
                        'type' => 'route',
                        'position' => 2,
                        'label' => 'Branded domains',
                        'action' => '/dashboard/domains',
                        'id' => 235,
                    ],
                ],
            ],
            [
                'name' => 'Footer',
                'id' => '4tbwog',
                'positions' => ['footer'],
                'items' => [
                    [
                        'type' => 'route',
                        'id' => 'rlz27v',
                        'position' => 2,
                        'label' => 'Privacy Policy',
                        'action' => '/pages/privacy-policy',
                    ],
                    [
                        'type' => 'route',
                        'id' => 'p80pvk',
                        'position' => 3,
                        'label' => 'Terms of Service',
                        'action' => '/pages/terms-of-service',
                    ],
                    [
                        'type' => 'route',
                        'id' => 'q8dtht',
                        'position' => 4,
                        'label' => 'Contact Us',
                        'action' => '/contact',
                    ],
                ],
            ],
            [
                'name' => 'Footer Social',
                'id' => 'odw4ah',
                'positions' => ['footer-secondary'],
                'items' => [
                    [
                        'type' => 'link',
                        'id' => '6j747e',
                        'position' => 1,
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h7.621v-6.961h-2.343v-2.725h2.343V9.309c0-2.324 1.421-3.591 3.495-3.591.699-.002 1.397.034 2.092.105v2.43H16.78c-1.13 0-1.35.534-1.35 1.322v1.735h2.7l-.351 2.725h-2.365V21H19a2 2 0 002-2V5a2 2 0 00-2-2z',
                                ],
                            ],
                        ],
                        'action' => 'https://facebook.com',
                    ],
                    [
                        'type' => 'link',
                        'id' => 'jo96zw',
                        'position' => 2,
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M24 4.3c-.898.4-1.8.7-2.8.802 1-.602 1.8-1.602 2.198-2.704-1 .602-2 1-3.097 1.204C19.3 2.602 18 2 16.6 2a4.907 4.907 0 00-4.9 4.898c0 .403 0 .801.102 1.102C7.7 7.8 4.102 5.898 1.7 2.898c-.5.704-.7 1.602-.7 2.5 0 1.704.898 3.204 2.2 4.102-.802-.102-1.598-.3-2.2-.602V9c0 2.398 1.7 4.398 3.898 4.8-.398.098-.796.2-1.296.2-.301 0-.602 0-.903-.102.602 2 2.403 3.403 4.602 3.403-1.7 1.3-3.801 2.097-6.102 2.097-.398 0-.8 0-1.199-.097C2.2 20.699 4.8 21.5 7.5 21.5c9.102 0 14-7.5 14-14v-.602c1-.699 1.8-1.597 2.5-2.597',
                                ],
                            ],
                        ],
                        'action' => 'https://twitter.com',
                    ],
                    [
                        'type' => 'link',
                        'id' => '57dsea',
                        'position' => 3,
                        'action' => 'https://instagram.com',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913a5.885 5.885 0 001.384 2.126A5.868 5.868 0 004.14 23.37c.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558a5.898 5.898 0 002.126-1.384 5.86 5.86 0 001.384-2.126c.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913a5.89 5.89 0 00-1.384-2.126A5.847 5.847 0 0019.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227a3.81 3.81 0 01-.899 1.382 3.744 3.744 0 01-1.38.896c-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421a3.716 3.716 0 01-1.379-.899 3.644 3.644 0 01-.9-1.38c-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 01-2.88 0 1.44 1.44 0 012.88 0z',
                                ],
                            ],
                        ],
                    ],
                    [
                        'type' => 'link',
                        'id' => 'lzntr2',
                        'position' => 4,
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M5.68 2l1.478 5.344v2.562H8.44V7.344L9.937 2h-1.29l-.538 2.432a27.21 27.21 0 00-.29 1.515h-.04c-.063-.42-.159-.93-.29-1.525L6.97 2H5.68zm5.752 2.018c-.434 0-.784.084-1.051.257-.267.172-.464.448-.59.825-.125.377-.187.876-.187 1.498v.84c0 .615.054 1.107.164 1.478.11.371.295.644.556.82.261.176.62.264 1.078.264.446 0 .8-.087 1.06-.26.26-.173.45-.444.565-.818.116-.374.174-.869.174-1.485v-.84c0-.62-.059-1.118-.178-1.492-.119-.373-.308-.648-.566-.824-.258-.176-.598-.263-1.025-.263zm2.447.113v4.314c0 .534.09.927.271 1.178.182.251.465.377.848.377.552 0 .968-.267 1.244-.8h.028l.113.706H17.4V4.131h-1.298v4.588a.635.635 0 01-.23.263.569.569 0 01-.325.104c-.132 0-.226-.054-.283-.164-.057-.11-.086-.295-.086-.553V4.131h-1.3zm-2.477.781c.182 0 .311.095.383.287.072.191.108.495.108.91v1.8c0 .426-.036.735-.108.923-.072.188-.2.282-.38.283-.183 0-.309-.095-.378-.283-.07-.188-.103-.497-.103-.924V6.11c0-.414.035-.718.107-.91.072-.19.195-.287.371-.287zM5 11c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2H5zm7.049 2h1.056v2.568h.008c.095-.186.232-.335.407-.449.175-.114.364-.17.566-.17.26 0 .463.07.611.207.148.138.257.361.323.668.066.308.097.735.097 1.281v.772h.002c0 .727-.089 1.26-.264 1.602-.175.342-.447.513-.818.513-.207 0-.394-.047-.564-.142a.93.93 0 01-.383-.391h-.024l-.11.46h-.907V13zm-6.563.246h3.252v.885h-1.09v5.789H6.576v-5.79h-1.09v-.884zm11.612 1.705c.376 0 .665.07.867.207.2.138.343.354.426.645.082.292.123.695.123 1.209v.836h-1.836v.248c0 .313.008.547.027.703.02.156.057.27.115.342.058.072.148.107.27.107.164 0 .277-.064.338-.191.06-.127.094-.338.1-.635l.947.055a1.6 1.6 0 01.007.175c0 .451-.124.788-.37 1.01-.248.223-.595.334-1.046.334-.54 0-.92-.17-1.138-.51-.218-.339-.326-.863-.326-1.574v-.851c0-.732.112-1.267.337-1.604.225-.337.613-.506 1.159-.506zm-8.688.094h1.1v3.58c0 .217.024.373.072.465.048.093.126.139.238.139a.486.486 0 00.276-.088.538.538 0 00.193-.223v-3.873h1.1v4.875h-.862l-.093-.598h-.026c-.234.452-.584.678-1.05.678-.325 0-.561-.106-.715-.318-.154-.212-.233-.544-.233-.994v-3.643zm8.664.648c-.117 0-.204.036-.26.104-.056.069-.093.182-.11.338a6.504 6.504 0 00-.028.71v.35h.803v-.35c0-.312-.01-.548-.032-.71-.02-.162-.059-.276-.115-.342-.056-.066-.14-.1-.258-.1zm-3.482.036a.418.418 0 00-.293.126.699.699 0 00-.192.327v2.767a.487.487 0 00.438.256.337.337 0 00.277-.127c.07-.085.12-.228.149-.43.029-.2.043-.48.043-.835v-.627c0-.382-.011-.676-.035-.883-.024-.207-.067-.357-.127-.444a.299.299 0 00-.26-.13z',
                                ],
                            ],
                        ],
                        'action' => 'https://youtube.com',
                    ],
                ],
            ],
            [
                'name' => 'Auth Dropdown',
                'id' => 'h8r6vg',
                'items' => [
                    [
                        'label' => 'Admin Area',
                        'id' => 'upm1rv',
                        'action' => '/admin',
                        'type' => 'route',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19 5v2h-4V5h4M9 5v6H5V5h4m10 8v6h-4v-6h4M9 17v2H5v-2h4M21 3h-8v6h8V3zM11 3H3v10h8V3zm10 8h-8v10h8V11zm-10 4H3v6h8v-6z',
                                ],
                            ],
                        ],
                        'permissions' => ['admin.access'],
                    ],
                    [
                        'label' => 'Dashboard',
                        'id' => 'ehj0uk',
                        'action' => '/dashboard',
                        'type' => 'route',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M17 7h-4v2h4c1.65 0 3 1.35 3 3s-1.35 3-3 3h-4v2h4c2.76 0 5-2.24 5-5s-2.24-5-5-5zm-6 8H7c-1.65 0-3-1.35-3-3s1.35-3 3-3h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-2zm-3-4h8v2H8z',
                                ],
                            ],
                        ],
                    ],
                    [
                        'label' => 'Account Settings',
                        'id' => '6a89z5',
                        'action' => '/account-settings',
                        'type' => 'route',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
                                ],
                            ],
                        ],
                    ],
                ],
                'positions' => ['auth-dropdown'],
            ],
            [
                'name' => 'Admin Sidebar',
                'id' => '2d43u1',
                'items' => [
                    [
                        'label' => 'Analytics',
                        'id' => '886nz4',
                        'action' => '/admin',
                        'type' => 'route',
                        'condition' => 'admin',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z',
                                ],
                            ],

                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M7 12h2v5H7zm8-5h2v10h-2zm-4 7h2v3h-2zm0-4h2v2h-2z',
                                ],
                            ],
                        ],
                        'role' => 1,
                        'permissions' => ['admin.access'],
                        'roles' => [],
                    ],
                    [
                        'label' => 'Appearance',
                        'id' => 'slcqm0',
                        'action' => '/admin/appearance',
                        'type' => 'route',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'm2.53 19.65 1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zm-9.2 3.8L7.87 7.79l7.35-3.04h.01l4.95 11.95-7.35 3.05z',
                                ],
                            ],
                            [
                                'tag' => 'circle',
                                'attr' => [
                                    'cx' => '11',
                                    'cy' => '9',
                                    'r' => '1',
                                ],
                            ],
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M5.88 19.75c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z',
                                ],
                            ],
                        ],
                        'permissions' => ['appearance.update'],
                    ],
                    [
                        'label' => 'Settings',
                        'id' => 'x5k484',
                        'action' => '/admin/settings',
                        'type' => 'route',

                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73 0 .21-.02.43-.05.73l-.14 1.13.89.7 1.08.84-.7 1.21-1.27-.51-1.04-.42-.9.68c-.43.32-.84.56-1.25.73l-1.06.43-.16 1.13-.2 1.35h-1.4l-.19-1.35-.16-1.13-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7-1.06.43-1.27.51-.7-1.21 1.08-.84.89-.7-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13-.89-.7-1.08-.84.7-1.21 1.27.51 1.04.42.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43.16-1.13.2-1.35h1.39l.19 1.35.16 1.13 1.06.43c.43.18.83.41 1.23.71l.91.7 1.06-.43 1.27-.51.7 1.21-1.07.85-.89.7.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
                                ],
                            ],
                        ],
                        'permissions' => ['settings.update'],
                    ],
                    [
                        'label' => 'Plans',
                        'id' => '7o42rt',
                        'action' => '/admin/plans',
                        'type' => 'route',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M7 15h7v2H7zm0-4h10v2H7zm0-4h10v2H7zm12-4h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-.14 0-.27.01-.4.04-.39.08-.74.28-1.01.55-.18.18-.33.4-.43.64-.1.23-.16.49-.16.77v14c0 .27.06.54.16.78s.25.45.43.64c.27.27.62.47 1.01.55.13.02.26.03.4.03h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7-.25c.41 0 .75.34.75.75s-.34.75-.75.75-.75-.34-.75-.75.34-.75.75-.75zM19 19H5V5h14v14z',
                                ],
                            ],
                        ],
                        'permissions' => ['plans.update'],
                    ],
                    [
                        'label' => 'Subscriptions',
                        'action' => '/admin/subscriptions',
                        'type' => 'route',
                        'id' => 'sdcb5a',
                        'condition' => 'admin',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M4 6h16v2H4zm2-4h12v2H6zm14 8H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm0 10H4v-8h16v8zm-10-7.27v6.53L16 16z',
                                ],
                            ],
                        ],
                        'permissions' => ['subscriptions.update'],
                    ],
                    [
                        'label' => 'Users',
                        'action' => '/admin/users',
                        'type' => 'route',
                        'id' => 'fzfb45',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M12 6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2m0 10c2.7 0 5.8 1.29 6 2H6c.23-.72 3.31-2 6-2m0-12C9.79 4 8 5.79 8 8s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 10c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
                                ],
                            ],
                        ],
                        'permissions' => ['users.update'],
                    ],
                    [
                        'label' => 'Roles',
                        'action' => '/admin/roles',
                        'type' => 'route',
                        'id' => 'mwdkf0',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M9 13.75c-2.34 0-7 1.17-7 3.5V19h14v-1.75c0-2.33-4.66-3.5-7-3.5zM4.34 17c.84-.58 2.87-1.25 4.66-1.25s3.82.67 4.66 1.25H4.34zM9 12c1.93 0 3.5-1.57 3.5-3.5S10.93 5 9 5 5.5 6.57 5.5 8.5 7.07 12 9 12zm0-5c.83 0 1.5.67 1.5 1.5S9.83 10 9 10s-1.5-.67-1.5-1.5S8.17 7 9 7zm7.04 6.81c1.16.84 1.96 1.96 1.96 3.44V19h4v-1.75c0-2.02-3.5-3.17-5.96-3.44zM15 12c1.93 0 3.5-1.57 3.5-3.5S16.93 5 15 5c-.54 0-1.04.13-1.5.35.63.89 1 1.98 1 3.15s-.37 2.26-1 3.15c.46.22.96.35 1.5.35z',
                                ],
                            ],
                        ],
                        'permissions' => ['roles.update'],
                    ],

                    [
                        'type' => 'route',
                        'label' => 'Projects',
                        'action' => '/admin/projects',
                        'id' => 2394,
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19 5v2h-4V5h4M9 5v6H5V5h4m10 8v6h-4v-6h4M9 17v2H5v-2h4M21 3h-8v6h8V3zM11 3H3v10h8V3zm10 8h-8v10h8V11zm-10 4H3v6h8v-6z',
                                ],
                            ],
                        ],
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Templates',
                        'action' => '/admin/templates',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 9h10.5v3.5H4V9zm0 5.5h10.5V18H4v-3.5zM20 18h-3.5V9H20v9z',
                                ],
                            ],
                        ],
                        'id' => 5864,
                    ],
                    [
                        'type' => 'route',
                        'label' => 'Branded Domains',
                        'action' => '/admin/custom-domains',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z',
                                ],
                            ],
                        ],
                        'id' => 4441,
                    ],
                    [
                        'label' => 'Pages',
                        'action' => '/admin/custom-pages',
                        'type' => 'route',
                        'id' => '63bwv9',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z',
                                ],
                            ],

                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M14 17H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
                                ],
                            ],
                        ],
                        'permissions' => ['custom_pages.update'],
                    ],
                    [
                        'label' => 'Files',
                        'action' => '/admin/files',
                        'type' => 'route',
                        'id' => 'vguvti',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm-1 4H8c-1.1 0-1.99.9-1.99 2L6 21c0 1.1.89 2 1.99 2H19c1.1 0 2-.9 2-2V11l-6-6zM8 21V7h6v5h5v9H8z',
                                ],
                            ],
                        ],
                        'permissions' => ['files.update'],
                    ],

                    [
                        'label' => 'Localizations',
                        'action' => '/admin/localizations',
                        'type' => 'route',
                        'id' => 'w91yql',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'm12.87 15.07-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7 1.62-4.33L19.12 17h-3.24z',
                                ],
                            ],
                        ],
                        'permissions' => ['localizations.update'],
                    ],

                    [
                        'label' => 'Ads',
                        'action' => '/admin/ads',
                        'type' => 'route',
                        'id' => 'ohj4qk',
                        'icon' => [
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' =>
                                        'M17 1H7c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zM7 4V3h10v1H7zm0 14V6h10v12H7zm0 3v-1h10v1H7z',
                                ],
                            ],
                            [
                                'tag' => 'path',
                                'attr' => [
                                    'd' => 'M16 7H8v2h8V7z',
                                ],
                            ],
                        ],
                        'permissions' => ['settings.update'],
                    ],
                ],
                'positions' => ['admin-sidebar'],
            ],
            [
                'name' => 'Homepage navbar',
                'id' => '5vgq1a',
                'positions' => ['homepage-navbar'],
                'items' => [
                    [
                        'type' => 'link',
                        'label' => 'Features',
                        'action' => '#features',
                        'id' => 19041,
                    ],
                    [
                        'type' => 'link',
                        'label' => 'Pricing',
                        'action' => '#pricing',
                        'id' => 190456,
                    ],
                ],
            ],
        ]),
    ],

    //branding
    ['name' => 'branding.site_name', 'value' => 'Architect'],

    //builder
    ['name' => 'builder.enable_subdomains', 'value' => false],
    ['name' => 'builder.enable_custom_domains', 'value' => true],
    [
        'name' => 'builder.googgle_fonts_api_key',
        'value' => 'AIzaSyDhc_8NKxXjtv69htFcUPe6A7oGSQ4om2o',
    ],
    [
        'name' => 'builder.template_categories',
        'value' => json_encode(['Landing Page', 'Blog', 'Portfolio']),
    ],
    ['name' => 'publish.allow_credential_change', 'value' => true],

    //landing
    [
        'name' => 'homepage.appearance',
        'value' => json_encode([
            'headerTitle' => "Create a Website You're Proud Of",
            'headerSubtitle' =>
                'Discover the platform that gives you the freedom to create, design, manage and develop your web presence exactly the way you want.',
            'headerImage' => 'images/landing/landing-bg.svg',
            'headerImageOpacity' => 1,
            'headerOverlayColor1' => null,
            'headerOverlayColor2' => null,
            'footerTitle' => 'Build your website today',
            'footerSubtitle' => null,
            'footerImage' => 'images/landing/landing-bg.svg',
            'pricingTitle' => 'Simple pricing, for everyone.',
            'pricingSubtitle' =>
                "It doesn't matter what size your business is, we offer a simple pricing model that scales with your needs.",
            'actions' => [
                'cta1' => [
                    'type' => 'route',
                    'action' => '/pricing',
                    'label' => 'Start Now',
                ],
                'cta3' => [
                    'label' => 'Sign up for free',
                    'type' => 'route',
                    'action' => '/register',
                ],
            ],
            'primaryFeatures' => [
                [
                    'title' => 'Custom domains',
                    'subtitle' =>
                        'Attach your own custom domain or use on of the free architect subdomains.',
                    'image' => 'images/landing/world.svg',
                ],
                [
                    'title' => 'Eye-catching website designs',
                    'subtitle' =>
                        'Our easy-to-use builder helps you create and launch a beautiful websites fast.',
                    'image' => 'images/landing/website-builder.svg',
                ],
                [
                    'title' => 'Grow with powerful tools',
                    'subtitle' =>
                        'Design and build your own high-quality websites. Whatever the type of site, you can do it with Architect website builder.',
                    'image' => 'images/landing/pen-tool.svg',
                ],
            ],
            'secondaryFeatures' => [
                [
                    'title' => 'Look like an expert right from the start.',
                    'subtitle' => 'AWARD-WINNING WEBSITE DESIGN',
                    'image' => 'images/landing/landing-feature-1.webp',
                    'description' =>
                        'Our award-winning templates are the most beautiful way to present your ideas online. Stand out with a professional website, portfolio, or online store.',
                ],
                [
                    'title' => 'The Freedom to Create the Websites You Want',
                    'subtitle' => 'Complete Freedom',
                    'image' => 'images/landing/landing-feature-2.webp',
                    'description' =>
                        "Start from scratch or choose from large catalog of templates to make your own website. With the world's most innovative drag and drop website builder, you can customize or change anything. With the Architect, you can create your own professional website that looks stunning.",
                ],
            ],
        ]),
    ],
];
