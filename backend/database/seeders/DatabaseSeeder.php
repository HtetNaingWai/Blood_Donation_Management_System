<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate([
            'email' => 'admin@lifeblood.local',
        ], [
            'name' => 'LifeBlood Admin',
            'password' => Hash::make('Admin@12345'),
            'role' => User::ROLE_ADMIN,
            'status' => 'active',
        ]);
    }
}
