<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            if (! Schema::hasColumn('patients', 'township')) {
                $table->string('township')->nullable()->after('needed_blood_type');
            }

            if (! Schema::hasColumn('patients', 'request_note')) {
                $table->text('request_note')->nullable()->after('township');
            }
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $columnsToDrop = [];

            if (Schema::hasColumn('patients', 'request_note')) {
                $columnsToDrop[] = 'request_note';
            }

            if (Schema::hasColumn('patients', 'township')) {
                $columnsToDrop[] = 'township';
            }

            if ($columnsToDrop !== []) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
