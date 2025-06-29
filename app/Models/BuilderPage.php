<?php namespace App\Models;

use Illuminate\Database\Eloquent\Model as Eloquent;

class BuilderPage extends Eloquent {

    protected $guarded = ['id'];

    protected $casts = [
        'access_level' => 'string',
        'requires_auth' => 'boolean',
        'allowed_roles' => 'array',
    ];

   	public function pageable()
    {
        return $this->morphTo();
    }
}
