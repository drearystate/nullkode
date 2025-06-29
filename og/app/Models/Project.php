<?php namespace App\Models;

use Common\Core\BaseModel;
use Common\Domains\CustomDomain;
use Common\Workspaces\Traits\BelongsToWorkspace;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Laravel\Scout\Searchable;

class Project extends BaseModel
{
    use Searchable, BelongsToWorkspace;

    protected $guarded = ['id'];

    protected $casts = [
        'published' => 'boolean',
        'user_id' => 'integer',
    ];

    const MODEL_TYPE = 'project';

    public function pages(): MorphMany
    {
        return $this->morphMany(BuilderPage::class, 'pageable');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function domain(): MorphOne
    {
        return $this->morphOne(CustomDomain::class, 'resource')->select(
            'id',
            'host',
            'resource_id',
            'resource_type',
        );
    }

    protected function settings(): Attribute
    {
        return Attribute::make(
            get: function ($value) {
                return $value ? json_decode($value, true) : [];
            },
            set: function ($value) {
                return json_encode($value);
            },
        );
    }

    public function formsEmail(): string
    {
        return $this->settings['formsEmail'] ?? $this->user->email;
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'created_at' => $this->created_at->timestamp ?? '_null',
            'updated_at' => $this->updated_at->timestamp ?? '_null',
        ];
    }

    public static function filterableFields(): array
    {
        return ['id', 'created_at', 'updated_at'];
    }

    public function toNormalizedArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->display_name,
            'model_type' => self::MODEL_TYPE,
        ];
    }

    public static function getModelTypeAttribute(): string
    {
        return self::MODEL_TYPE;
    }
}
