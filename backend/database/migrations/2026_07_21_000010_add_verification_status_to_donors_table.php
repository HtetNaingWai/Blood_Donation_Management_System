<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('donors', function (Blueprint $table): void {
            // Keep donor trust/verification separate from generic user account status.
            if (! Schema::hasColumn('donors', 'verification_status')) {
                $table->string('verification_status', 30)
                    ->default('verified')
                    ->after('availability_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('donors', function (Blueprint $table): void {
            if (Schema::hasColumn('donors', 'verification_status')) {
                $table->dropColumn('verification_status');
            }
        });
    }
};
