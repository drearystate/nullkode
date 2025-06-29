<?php namespace App\Models;

use Illuminate\Database\Eloquent\Model as Eloquent;

class BuilderPage extends Eloquent {

    protected $guarded = ['id'];

   	public function pageable()
    {
        return $this->morphTo();
    }
}
