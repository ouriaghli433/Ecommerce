<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Two accounts you can log in with, plus a group of customers so the admin
 * lists have something to show.
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'first_name' => 'Amine',
                'last_name' => 'Admin',
                'password' => Hash::make('password'),
            ],
        );

        // role is not mass assignable on purpose (RG1), so it is set here.
        $admin->forceFill(['role' => 'admin'])->save();

        $secondAdmin = User::firstOrCreate(
            ['email' => 'manager@example.com'],
            [
                'first_name' => 'Nadia',
                'last_name' => 'Manager',
                'password' => Hash::make('password'),
            ],
        );

        $secondAdmin->forceFill(['role' => 'admin'])->save();

        User::firstOrCreate(
            ['email' => 'customer@example.com'],
            [
                'first_name' => 'Sara',
                'last_name' => 'Client',
                'password' => Hash::make('password'),
            ],
        );

        // 24 more customers, so pagination and the user list look real.
        $missing = 25 - User::where('role', 'customer')->count();

        if ($missing > 0) {
            User::factory()->count($missing)->create();
        }

        $this->command->info('Users: '.User::count());
    }
}
