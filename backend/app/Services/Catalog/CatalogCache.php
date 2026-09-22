<?php

namespace App\Services\Catalog;

use Closure;
use Illuminate\Support\Facades\Cache;

/**
 * Caches the catalog listings in Redis.
 *
 * WHY only the catalog: categories and products are read on every page and
 * change rarely. Stock is the opposite - it changes on every checkout - so
 * available_stock is never part of a cached listing. It is read live from the
 * database on the product page.
 *
 * HOW the cache is cleared: instead of deleting many keys one by one, every
 * key contains a version number. Changing a product increases that number,
 * so all the old keys stop being used at once and Redis drops them when
 * their time is over. This is easy to reason about and impossible to forget
 * halfway.
 */
class CatalogCache
{
    private const VERSION_KEY = 'catalog:version';

    private const TTL_SECONDS = 300; // 5 minutes

    /**
     * Run the query only when the answer is not in the cache yet.
     *
     * @param  array<string, mixed>  $parts  what makes this listing unique
     */
    public function remember(string $name, array $parts, Closure $callback): mixed
    {
        return Cache::remember($this->key($name, $parts), self::TTL_SECONDS, $callback);
    }

    /**
     * Called after any write to a category or a product.
     */
    public function flush(): void
    {
        Cache::increment(self::VERSION_KEY);
    }

    private function key(string $name, array $parts): string
    {
        // add() only writes when the key is missing, so the version starts at 1
        Cache::add(self::VERSION_KEY, 1);

        $version = Cache::get(self::VERSION_KEY, 1);

        return 'catalog:v'.$version.':'.$name.':'.md5(json_encode($parts));
    }
}
