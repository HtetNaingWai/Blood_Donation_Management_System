<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('request_responses')) {
            return;
        }

        Schema::create('request_responses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('emergency_request_id')->constrained('emergency_requests')->cascadeOnDelete();
            $table->foreignId('donor_id')->nullable()->constrained('donors')->nullOnDelete();
            $table->foreignId('hospital_id')->nullable()->constrained('hospitals')->nullOnDelete();
            $table->string('status', 40)->default('accepted');
            $table->unsignedInteger('eta_minutes')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_responses');
    }
};
