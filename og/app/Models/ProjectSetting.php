<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectSetting extends Model
{
    protected $visible = [
        'name',
        'value',
    ];
}
