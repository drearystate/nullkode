<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiHistoryItem extends Model
{
    protected $table = 'ai_history';
    protected $guarded = ['id'];
    protected $casts = [
        'user_id' => 'integer',
        'tokens_used' => 'integer'
    ];

    const GENERATE_TEXT = 'generateText';
    const MODIFY_TEXT = 'modifyText';
    const GENERATE_IMAGE = 'generateImage';
    const MODIFY_IMAGE = 'modifyImage';

    public function scopeText($query)
    {
        return $query->where(function ($query) {
            $query
                ->where('type', self::GENERATE_TEXT)
                ->orWhere('type', self::MODIFY_TEXT);
        });
    }

    public function scopeImages($query)
    {
        return $query->where(function ($query) {
            $query
                ->where('type', self::GENERATE_IMAGE)
                ->orWhere('type', self::MODIFY_IMAGE);
        });
    }
}
