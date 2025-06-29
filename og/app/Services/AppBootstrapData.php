<?php namespace App\Services;

use Common\Core\Bootstrap\BaseBootstrapData;

class AppBootstrapData extends BaseBootstrapData
{
    public function init(): self
    {
        parent::init();

        $this->data['settings']['ai_setup'] = config(
            'services.openai.api_key',
        );

        return $this;
    }
}
