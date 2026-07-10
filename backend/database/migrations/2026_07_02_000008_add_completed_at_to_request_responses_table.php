<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('request_responses')) {
            return;
        }

        Schema::table('request_responses', function (Blueprint $table): void {
            if (! Schema::hasColumn('request_responses', 'completed_at')) {
                $table->timestamp('completed_at')->nullable()->after('notes');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('request_responses')) {
            return;
        }

        Schema::table('request_responses', function (Blueprint $table): void {
            if (Schema::hasColumn('request_responses', 'completed_at')) {
                $table->dropColumn('completed_at');
            }
        });
    }
};
