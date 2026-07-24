<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('emergency_requests')) {
            return;
        }

        Schema::table('emergency_requests', function (Blueprint $table): void {
            // Direct hospital-to-donor requests need an owning donor reference for authorization decisions.
            if (! Schema::hasColumn('emergency_requests', 'donor_id')) {
                $table->foreignId('donor_id')
                    ->nullable()
                    ->after('hospital_id')
                    ->constrained('donors')
                    ->nullOnDelete();
            }

            // Hospitals can attach a short request note for the donor.
            if (! Schema::hasColumn('emergency_requests', 'message')) {
                $table->text('message')
                    ->nullable()
                    ->after('priority');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('emergency_requests')) {
            return;
        }

        Schema::table('emergency_requests', function (Blueprint $table): void {
            if (Schema::hasColumn('emergency_requests', 'donor_id')) {
                $table->dropConstrainedForeignId('donor_id');
            }

            if (Schema::hasColumn('emergency_requests', 'message')) {
                $table->dropColumn('message');
            }
        });
    }
};
