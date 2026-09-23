<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

/**
 * Four main categories, each with its sub-categories, so the category tree
 * (RG4) is visible in the shop menu and in the admin.
 */
class CategorySeeder extends Seeder
{
    /**
     * parent => [children]
     */
    private array $tree = [
        'Electronics' => ['Phones', 'Laptops', 'Tablets'],
        'Audio' => ['Headphones', 'Speakers'],
        'Accessories' => ['Chargers', 'Phone cases'],
        'Home' => ['Lighting & decoration', 'Kitchen'],
    ];

    public function run(): void
    {
        foreach ($this->tree as $parentName => $children) {
            $parent = $this->make($parentName);

            foreach ($children as $childName) {
                $this->make($childName, $parent);
            }
        }

        // One category kept hidden, to show the "not visible" case.
        $this->make('Seasonal', null, false);

        $this->command->info('Categories: '.Category::count());
    }

    private function make(string $name, ?Category $parent = null, bool $active = true): Category
    {
        return Category::firstOrCreate(
            ['slug' => str($name)->slug()->value()],
            [
                'name' => $name,
                'description' => "Everything in our {$name} selection.",
                'is_active' => $active,
                'parent_id' => $parent?->id,
            ],
        );
    }
}
